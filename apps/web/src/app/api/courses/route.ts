import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      units: {
        orderBy: { sortOrder: "asc" },
        include: {
          skills: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: {
                orderBy: { sortOrder: "asc" },
                include: {
                  exercises: { orderBy: { sortOrder: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });
  return NextResponse.json(courses);
}
