import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

export async function getCurrentTenant(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const tenantId = user.publicMetadata?.tenantId;
  
  if (typeof tenantId !== 'string' || !tenantId) {
    throw new Error('User has no assigned tenant.');
  }
  
  return tenantId;
}
