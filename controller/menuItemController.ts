import "dotenv/config";
import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import { prisma } from "../utils/prisma";
import { menuItems as IMenuItems } from "@prisma/client";
import { supabase } from "../utils/supabaseConfig";

interface IMenuBody extends IMenuItems {}

export const addMenuItem = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        price,
        isVeg,
        description,
        availability,
        category,
      }: IMenuBody = req.body;

      const { file } = req;

      const menu_id = req.params.menu_id;

      if (!name || !isVeg || !price) {
        return next(new ErrorHandler("Enter all fields", 400));
      }

      let imagePath = "";

      if (file) {
        const { data, error } = await supabase.storage
          .from("images")
          .upload(`menuImages/${Date.now()}_${name}`, file.buffer, {
            contentType: "image/*",
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          return next(new ErrorHandler("Image upload failed", 500));
        }

        const {
          data: { publicUrl },
        } = await supabase.storage.from("images").getPublicUrl(data.path);

        imagePath = publicUrl;
      }

      const menuItem = await prisma.menuItems.create({
        data: {
          name: name,
          price: price,
          description: description || undefined,
          category: category || undefined,
          availability: availability || true,
          isVeg: isVeg,
          image_url: imagePath || undefined,
          menu: { connect: { menu_id: menu_id } },
        },
        include: {
          menu: true,
        },
      });

      if (!menuItem) {
        return next(new ErrorHandler("Failed to add menu item", 401));
      }

      res.status(200).json({
        success: true,
        message: "Menu item added successfully",
        menuItem,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const deleteMenuItem = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menu_item_id = req.params.menu_item_id;

      if (!menu_item_id) {
        return next(new ErrorHandler("Id not given", 400));
      }

      const menuItem = await prisma.menuItems.delete({
        where: {
          id: menu_item_id,
        },
      });

      if (menuItem.image_url) {
        const filePath = menuItem.image_url.split(
          `${process.env.SUPABASE_URL}/storage/v1/object/public/images/`
        )[1];

        // Delete the file from Supabase Storage
        const { error } = await supabase.storage
          .from("images") // Make sure 'images' matches your bucket name
          .remove([filePath]);

        if (error) {
          return next(new ErrorHandler("Error while deleting image", 400));
        }
      }

      if (!menuItem) {
        return next(new ErrorHandler("Failed to delete menu item", 401));
      }

      res.status(200).json({
        success: true,
        message: "Menu item deleted successfully",
        menuItem,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const getMenuItem = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const menu_item_id = req.params.menu_item_id;

      if (!menu_item_id) {
        return next(new ErrorHandler("Id not given", 400));
      }

      const menuItem = await prisma.menuItems.findUnique({
        where: {
          id: menu_item_id,
        },
      });

      if (!menuItem) {
        return next(new ErrorHandler("Menu item not found", 404));
      }

      res.status(200).json({
        success: true,
        menuItem,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

export const updateMenuItem = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, price, isVeg, description, availability }: IMenuBody =
        req.body;

      const { file } = req;

      const menu_item_id = req.params.menu_item_id;

      if (!menu_item_id) {
        return next(new ErrorHandler("Id not given", 400));
      }

      const menuItem = await prisma.menuItems.findUnique({
        where: {
          id: menu_item_id,
        },
      });

      if (!menuItem) {
        return next(new ErrorHandler("Menu item not found", 404));
      }

      let publicUrl = menuItem.image_url;

      if (file) {
        if (menuItem.image_url) {
          const filePath = menuItem.image_url.split(
            `${process.env.SUPABASE_URL}/storage/v1/object/public/images/`
          )[1];

          // Update the image in Supabase Storage
          const { data, error } = await supabase.storage
            .from("images") // Bucket name
            .update(filePath, file.buffer, {
              cacheControl: "3600",
              upsert: false, // Prevent creating a new file if it doesn’t exist
            });

          if (error) {
            return next(
              new ErrorHandler("Failed to update image in storage", 500)
            );
          }

          // Generate the new public URL for the updated image
          publicUrl = supabase.storage.from("images").getPublicUrl(filePath)
            .data.publicUrl;
        } else {
          const { data, error } = await supabase.storage
            .from("images")
            .upload(`menuImages/${Date.now()}_${name}`, file.buffer, {
              contentType: "image/*",
              cacheControl: "3600",
              upsert: false,
            });

          if (error) {
            return next(new ErrorHandler("Image upload failed", 500));
          }

          const {
            data: { publicUrl: url },
          } = await supabase.storage.from("images").getPublicUrl(data.path);

          publicUrl = url;
        }
      }

      // Update only the provided fields
      const updatedMenuItem = await prisma.menuItems.update({
        where: {
          id: menu_item_id,
        },
        data: {
          ...(name && { name }),
          ...(price && { price }),
          ...(isVeg !== undefined && { isVeg }), // Check specifically for undefined to allow `false` as a valid input
          ...(description && { description }),
          ...(availability !== undefined && { availability }), // Same check for availability
          ...(publicUrl && { image_url: publicUrl }),
        },
      });

      if (!updatedMenuItem) {
        return next(new ErrorHandler("failed to update menu item", 401));
      }

      res.status(200).json({
        success: true,
        updatedMenuItem,
      });
    } catch (error) {
      return next(new ErrorHandler("Internal server error", 500));
    }
  }
);

// export const uploadTest = catchAsyncError(
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { file } = req;

//       const filePath = `menuImages/${file!.originalname}`;

//       const { data, error } = await supabase.storage
//         .from("images") // Bucket name
//         .upload(filePath, file!.buffer, {
//           cacheControl: "3600",
//           upsert: false,
//         });

//       if (error) {
//         throw error;
//       }

//       const { data: redata } = await supabase.storage
//         .from("images")
//         .getPublicUrl(data.path);

//       res.status(200).json({
//         success: true,
//         filePath: data.path,
//       });
//     } catch (error: any) {
//       return next(
//         new ErrorHandler("Internal server error" + error.message, 500)
//       );
//     }
//   }
// );
