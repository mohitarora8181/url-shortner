import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import type { CurrentUser } from "../../common/types/current-user.type";
import { User, UserDocument } from "./schemas/user.schema";

type CreateUserInput = {
  name: string;
  email: string;
  googleId?: string;
  avatarUrl?: string;
};

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async createUser(input: CreateUserInput): Promise<UserDocument> {
    return this.userModel.create(input);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async updateGoogleProfile(
    user: UserDocument,
    input: { googleId: string; name: string; email: string; avatarUrl?: string }
  ): Promise<UserDocument> {
    user.googleId = input.googleId;
    user.name = input.name;
    user.email = input.email;
    user.avatarUrl = input.avatarUrl;

    return user.save();
  }

  async findAuthContextById(id: string): Promise<CurrentUser | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const user = await this.userModel.findById(id).select("_id name email").lean().exec();
    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email
    };
  }
}
