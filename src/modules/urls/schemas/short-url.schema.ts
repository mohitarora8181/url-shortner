import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";
import { User } from "../../users/schemas/user.schema";

@Schema({
  collection: "urls",
  timestamps: true,
  versionKey: false
})
export class ShortUrl {
  _id: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true
  })
  owner: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    maxlength: 2048
  })
  originalUrl: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    index: true,
    minlength: 3,
    maxlength: 64
  })
  shortCode: string;

  @Prop({
    trim: true,
    index: true,
    minlength: 3,
    maxlength: 64
  })
  customAlias?: string;

  @Prop({
    default: 0,
    min: 0
  })
  clickCount: number;

  @Prop()
  lastAccessedAt?: Date;

  @Prop({
    default: true,
    index: true
  })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ShortUrlDocument = HydratedDocument<ShortUrl>;
export const ShortUrlSchema = SchemaFactory.createForClass(ShortUrl);

ShortUrlSchema.index({ owner: 1, createdAt: -1 });
ShortUrlSchema.index({ owner: 1, customAlias: 1 });
