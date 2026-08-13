// ============================================================
// VIREON — CORE: BASE REPOSITORY (Repository Pattern)
// Generic CRUD repository using Mongoose
// ============================================================
import { Model, Document, FilterQuery, UpdateQuery, PopulateOptions } from 'mongoose';
import type { IPaginationMeta, IPaginationQuery } from '../shared';

export interface FindAllResult<T> {
  data: T[];
  meta: IPaginationMeta;
}

export abstract class BaseRepository<T extends Document> {
  protected readonly model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async findById(id: string, populate?: PopulateOptions | PopulateOptions[]): Promise<T | null> {
    let query = this.model.findById(id);
    if (populate) query = query.populate(populate) as typeof query;
    return query.lean<T>().exec() as Promise<T | null>;
  }

  async findOne(filter: FilterQuery<T>, populate?: PopulateOptions | PopulateOptions[]): Promise<T | null> {
    let query = this.model.findOne(filter);
    if (populate) query = query.populate(populate) as typeof query;
    return query.lean<T>().exec() as Promise<T | null>;
  }

  async findAll(
    filter: FilterQuery<T> = {},
    paginationQuery: IPaginationQuery = {},
    populate?: PopulateOptions | PopulateOptions[]
  ): Promise<FindAllResult<T>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = paginationQuery;

    // Apply text search if search string provided
    const searchFilter: FilterQuery<T> = search
      ? { ...filter, $text: { $search: search } }
      : filter;

    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      (populate
        ? this.model.find(searchFilter).sort({ [sortBy]: sortDirection }).skip(skip).limit(limit).populate(populate).lean()
        : this.model.find(searchFilter).sort({ [sortBy]: sortDirection }).skip(skip).limit(limit).lean()) as Promise<T[]>,
      this.model.countDocuments(searchFilter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async create(data: Partial<T>): Promise<T> {
    const document = new this.model(data);
    return (await document.save()).toObject() as T;
  }

  async updateById(
    id: string,
    update: UpdateQuery<T>,
    returnNew = true
  ): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, update, { new: returnNew, runValidators: true })
      .lean<T>()
      .exec() as Promise<T | null>;
  }

  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).lean<T>().exec() as Promise<T | null>;
  }

  async softDeleteById(id: string): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, { isActive: false } as UpdateQuery<T>, { new: true })
      .lean<T>()
      .exec() as Promise<T | null>;
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter);
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter);
    return count > 0;
  }

  async bulkCreate(data: Partial<T>[]): Promise<T[]> {
    const documents = await this.model.insertMany(data);
    return documents as unknown as T[];
  }
}
