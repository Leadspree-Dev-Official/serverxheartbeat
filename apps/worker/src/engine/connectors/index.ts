import { ProviderType } from '@heartbeat/shared';
import { BaseConnector } from './base';
import { SupabaseConnector } from './supabase';
import { AppwriteConnector } from './appwrite';
import { GenericConnector } from './generic';

export * from './base';
export * from './supabase';
export * from './appwrite';
export * from './generic';

const supabaseConnector = new SupabaseConnector();
const appwriteConnector = new AppwriteConnector();
const genericConnector = new GenericConnector();

export function getConnector(provider: ProviderType): BaseConnector {
  switch (provider) {
    case 'supabase':
      return supabaseConnector;
    case 'appwrite':
      return appwriteConnector;
    case 'generic':
    default:
      return genericConnector;
  }
}
