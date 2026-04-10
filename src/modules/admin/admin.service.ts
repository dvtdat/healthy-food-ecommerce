import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mongodb';
import { wrap } from '@mikro-orm/core';
import {
  Category,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Review,
  User,
} from 'src/entities';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: EntityRepository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: EntityRepository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: EntityRepository<Product>,
    @InjectRepository(User)
    private readonly userRepo: EntityRepository<User>,
    @InjectRepository(Review)
    private readonly reviewRepo: EntityRepository<Review>,
  ) {}

  async getStats() {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const em = this.orderRepo.getEntityManager();

    const [
      statusAgg,
      revenueAgg,
      revenueByDayAgg,
      recentOrders,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      orderItemAgg,
      allProducts,
      totalUsers,
      newUsersThisWeek,
      newUsersThisMonth,
      ratingAgg,
    ] = await Promise.all([
      // Count of orders grouped by status
      em.aggregate(Order, [
        { $match: { deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Total revenue and order count (excludes cancelled)
      em.aggregate(Order, [
        { $match: { deletedAt: null, status: { $ne: OrderStatus.CANCELLED } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Revenue per day for the last 30 days (for line/bar chart)
      em.aggregate(Order, [
        {
          $match: {
            deletedAt: null,
            status: { $ne: OrderStatus.CANCELLED },
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
      ]),

      // Last 10 orders for activity feed
      this.orderRepo.find(
        { deletedAt: null },
        { orderBy: { createdAt: 'desc' }, limit: 10, populate: ['user'] },
      ),

      // Order counts by period
      this.orderRepo.count({
        deletedAt: null,
        createdAt: { $gte: startOfToday } as any,
      }),
      this.orderRepo.count({
        deletedAt: null,
        createdAt: { $gte: startOfWeek } as any,
      }),
      this.orderRepo.count({
        deletedAt: null,
        createdAt: { $gte: startOfMonth } as any,
      }),

      // Units sold and revenue per product (used for top-5 tables + category revenue)
      em.aggregate(OrderItem, [
        {
          $group: {
            _id: '$product',
            unitsSold: { $sum: '$quantity' },
            revenue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
          },
        },
      ]),

      // All active products with category — used for product + category stats
      this.productRepo.find({ deletedAt: null }, { populate: ['category'] }),

      // User counts
      this.userRepo.count({ deletedAt: null }),
      this.userRepo.count({
        deletedAt: null,
        createdAt: { $gte: startOfWeek } as any,
      }),
      this.userRepo.count({
        deletedAt: null,
        createdAt: { $gte: startOfMonth } as any,
      }),

      // Global review stats
      em.aggregate(Review, [
        { $match: { deletedAt: null } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
      ]),
    ]);

    // ── Orders ──────────────────────────────────────────────────────────────

    const byStatus = Object.values(OrderStatus).reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<OrderStatus, number>,
    );
    for (const row of statusAgg) {
      byStatus[row._id as OrderStatus] = row.count;
    }

    const totalRevenue = revenueAgg[0]?.total ?? 0;
    const confirmedOrderCount = revenueAgg[0]?.count ?? 0;
    const averageOrderValue =
      confirmedOrderCount > 0
        ? Math.round(totalRevenue / confirmedOrderCount)
        : 0;

    // ── Products ─────────────────────────────────────────────────────────────

    // Map of productId → sales stats from OrderItem aggregation
    const salesMap = new Map<string, { unitsSold: number; revenue: number }>();
    for (const row of orderItemAgg) {
      salesMap.set(row._id.toHexString(), {
        unitsSold: row.unitsSold,
        revenue: row.revenue,
      });
    }

    // Indexed product map for fast lookup
    const productMap = new Map(
      allProducts.map((p) => [p._id.toHexString(), p]),
    );

    const toProductRow = (id: string) => {
      const p = productMap.get(id);
      const sales = salesMap.get(id) ?? { unitsSold: 0, revenue: 0 };
      return {
        id,
        name: p?.name ?? 'Unknown',
        category: (p?.category as Category)?.name ?? 'Unknown',
        ...sales,
      };
    };

    const topByOrders = [...salesMap.entries()]
      .sort((a, b) => b[1].unitsSold - a[1].unitsSold)
      .slice(0, 5)
      .map(([id]) => toProductRow(id));

    const topByRevenue = [...salesMap.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([id]) => toProductRow(id));

    const topByViews = allProducts
      .filter((p) => p.viewCount > 0)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5)
      .map((p) => ({
        id: p._id.toHexString(),
        name: p.name,
        category: (p.category as Category).name,
        viewCount: p.viewCount,
      }));

    const outOfStockCount = allProducts.filter((p) => p.stock === 0).length;

    const lowStock = allProducts
      .filter((p) => p.stock > 0 && p.stock <= 10)
      .sort((a, b) => a.stock - b.stock)
      .map((p) => ({
        id: p._id.toHexString(),
        name: p.name,
        category: (p.category as Category).name,
        stock: p.stock,
      }));

    // ── Categories ───────────────────────────────────────────────────────────

    const categoryProductCount = new Map<
      string,
      { id: string; name: string; count: number }
    >();
    const categoryRevenue = new Map<
      string,
      { id: string; name: string; revenue: number }
    >();

    for (const p of allProducts) {
      const cat = p.category as Category;
      const catId = cat._id.toHexString();
      const productRevenue = salesMap.get(p._id.toHexString())?.revenue ?? 0;

      const pc = categoryProductCount.get(catId) ?? {
        id: catId,
        name: cat.name,
        count: 0,
      };
      categoryProductCount.set(catId, { ...pc, count: pc.count + 1 });

      const cr = categoryRevenue.get(catId) ?? {
        id: catId,
        name: cat.name,
        revenue: 0,
      };
      categoryRevenue.set(catId, {
        ...cr,
        revenue: cr.revenue + productRevenue,
      });
    }

    // ── Assemble response ─────────────────────────────────────────────────────

    return {
      orders: {
        byStatus,
        totalRevenue,
        averageOrderValue,
        today: ordersToday,
        thisWeek: ordersThisWeek,
        thisMonth: ordersThisMonth,
        revenueByDay: revenueByDayAgg as {
          date: string;
          revenue: number;
          orders: number;
        }[],
        recent: recentOrders.map((o) => wrap(o).toPOJO()),
      },
      products: {
        total: allProducts.length,
        outOfStock: outOfStockCount,
        lowStock,
        topByOrders,
        topByRevenue,
        topByViews,
      },
      users: {
        total: totalUsers,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
      },
      reviews: {
        total: ratingAgg[0]?.total ?? 0,
        globalAverageRating: ratingAgg[0]?.avgRating
          ? Math.round(ratingAgg[0].avgRating * 10) / 10
          : 0,
      },
      categories: {
        productCount: [...categoryProductCount.values()].sort(
          (a, b) => b.count - a.count,
        ),
        revenue: [...categoryRevenue.values()].sort(
          (a, b) => b.revenue - a.revenue,
        ),
      },
    };
  }
}
