import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

@Schema({
  collection: "users",
  timestamps: true,
  versionKey: false
})
export class User {
  _id: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80
  })
  name: string;

  @Prop({
    required: true,
    unique: true,
    sparse: true,
    trim: true
  })
  googleId?: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 254
  })
  email: string;

  @Prop({
    trim: true
  })
  avatarUrl?: string;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
