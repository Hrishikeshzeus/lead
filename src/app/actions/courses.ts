"use server";

import { revalidatePath } from "next/cache";
import { getServerAuthSession } from "@/lib/auth/session";
import { CourseService } from "@/lib/courses/service";
import {
  CourseRecord,
  CreateCourseInput,
  UpdateCourseInput,
  CourseFilterParams,
} from "@/types/course";

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getCoursesAction(
  params: CourseFilterParams = {}
): Promise<ActionResult<CourseRecord[]>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const courses = await CourseService.listCourses(session, params);
    return { success: true, data: courses };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch courses" };
  }
}

export async function getCourseByIdAction(
  courseId: string
): Promise<ActionResult<CourseRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const course = await CourseService.getCourseById(session, courseId);
    if (!course) {
      return { success: false, error: "Course not found or access denied." };
    }
    return { success: true, data: course };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createCourseAction(
  input: CreateCourseInput
): Promise<ActionResult<CourseRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const course = await CourseService.createCourse(session, input);
    revalidatePath("/courses");
    revalidatePath("/");
    return { success: true, data: course };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create course" };
  }
}

export async function updateCourseAction(
  courseId: string,
  input: UpdateCourseInput
): Promise<ActionResult<CourseRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const course = await CourseService.updateCourse(session, courseId, input);
    revalidatePath("/courses");
    return { success: true, data: course };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update course" };
  }
}

export async function toggleCoursePublishAction(
  courseId: string,
  publish: boolean
): Promise<ActionResult<CourseRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const course = await CourseService.togglePublish(session, courseId, publish);
    revalidatePath("/courses");
    return { success: true, data: course };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update publish state" };
  }
}

export async function archiveCourseAction(
  courseId: string,
  archive: boolean
): Promise<ActionResult<CourseRecord>> {
  try {
    const session = await getServerAuthSession();
    if (!session.isAuthenticated) {
      return { success: false, error: "Authentication required." };
    }
    const course = await CourseService.archiveCourse(session, courseId, archive);
    revalidatePath("/courses");
    return { success: true, data: course };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update archive status" };
  }
}
