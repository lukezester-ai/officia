import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, workspaceMembers, workspaces } from "@/lib/db/schema";

export type WorkspaceBootstrapState = {
  status: "ready" | "preview" | "error";
  workspaceId: string | null;
  workspaceName: string;
  userName: string;
  message: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function getDisplayName(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) return "Finance Team";
  return user.firstName || user.fullName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "Finance Team";
}

export async function bootstrapWorkspace(): Promise<WorkspaceBootstrapState> {
  const user = await currentUser();
  const userName = getDisplayName(user);

  if (!user) {
    return {
      status: "preview",
      workspaceId: null,
      workspaceName: "Officia Preview",
      userName,
      message: "Sign in to create your workspace.",
    };
  }

  if (!db) {
    return {
      status: "preview",
      workspaceId: null,
      workspaceName: "Officia Preview",
      userName,
      message: "DATABASE_URL is not configured yet, so the dashboard is running in preview mode.",
    };
  }

  try {
    const existingWorkspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.ownerClerkUserId, user.id),
    });

    if (existingWorkspace) {
      return {
        status: "ready",
        workspaceId: existingWorkspace.id,
        workspaceName: existingWorkspace.name,
        userName,
        message: "Workspace loaded.",
      };
    }

    const email = user.primaryEmailAddress?.emailAddress || `${user.id}@officia.local`;
    const baseName = user.fullName || user.firstName || email.split("@")[0] || "Officia Workspace";
    const workspaceName = `${baseName}'s Workspace`;
    const workspaceSlug = `${slugify(baseName) || "workspace"}-${user.id.slice(-6).toLowerCase()}`;

    const [createdWorkspace] = await db
      .insert(workspaces)
      .values({
        name: workspaceName,
        slug: workspaceSlug,
        ownerClerkUserId: user.id,
      })
      .returning();

    await db.insert(workspaceMembers).values({
      workspaceId: createdWorkspace.id,
      clerkUserId: user.id,
      email,
      role: "owner",
    });

    await db.insert(subscriptions).values({
      workspaceId: createdWorkspace.id,
      plan: "starter",
      status: "trialing",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    return {
      status: "ready",
      workspaceId: createdWorkspace.id,
      workspaceName: createdWorkspace.name,
      userName,
      message: "Workspace created with a Starter trial.",
    };
  } catch (error) {
    console.error("Workspace bootstrap failed:", error);
    return {
      status: "error",
      workspaceId: null,
      workspaceName: "Officia Preview",
      userName,
      message: "Workspace bootstrap failed. Check DATABASE_URL and run supabase-app-schema.sql.",
    };
  }
}
