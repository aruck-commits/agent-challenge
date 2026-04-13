import * as ElizaCore from '@elizaos/core';
import { orionCharacter } from './character';

const ELIZA_RUNTIME_FLAG = '__orion_eliza_runtime__';
const ELIZA_STARTUP_ERROR_FLAG = '__orion_eliza_startup_error__';
const ELIZA_PLUGIN_PACKAGE_FLAG = '__orion_eliza_plugin_package__';
const ELIZA_REGISTERED_PLUGINS_FLAG = '__orion_eliza_registered_plugins__';
const ELIZA_REGISTERED_CLIENTS_FLAG = '__orion_eliza_registered_clients__';

type GlobalElizaRuntime = typeof globalThis & {
  [ELIZA_RUNTIME_FLAG]?: any;
  [ELIZA_STARTUP_ERROR_FLAG]?: string;
  [ELIZA_PLUGIN_PACKAGE_FLAG]?: string;
  [ELIZA_REGISTERED_PLUGINS_FLAG]?: string[];
  [ELIZA_REGISTERED_CLIENTS_FLAG]?: string[];
};

function getGlobalState(): GlobalElizaRuntime {
  const g = globalThis as GlobalElizaRuntime;
  if (!g[ELIZA_REGISTERED_PLUGINS_FLAG]) g[ELIZA_REGISTERED_PLUGINS_FLAG] = [];
  if (!g[ELIZA_REGISTERED_CLIENTS_FLAG]) g[ELIZA_REGISTERED_CLIENTS_FLAG] = [];
  return g;
}

function buildElizaCharacter(parseCharacter: (input: unknown) => any, solanaPluginPackage: string) {
  const { messageExamples: _legacyMessageExamples, ...characterWithoutLegacyExamples } = orionCharacter as any;

  const plugins = new Set<string>([
    ...(characterWithoutLegacyExamples.plugins ?? []),
    solanaPluginPackage,
  ]);

  if (process.env.TELEGRAM_BOT_TOKEN) {
    plugins.add('@elizaos/client-telegram');
  }

  return parseCharacter({
    ...characterWithoutLegacyExamples,
    plugins: [...plugins],
    settings: {
      ...(characterWithoutLegacyExamples.settings ?? {}),
      SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    },
    secrets: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? '',
      key: process.env.TELEGRAM_BOT_TOKEN ?? '',
    },
  } as any);
}

async function importSolanaPlugin(): Promise<{ plugin: any; packageName: string }> {
  const dynamicImport = (name: string) =>
    new Function('moduleName', 'return import(moduleName)')(name) as Promise<any>;

  try {
    const mod = await dynamicImport('@elizaos/plugin-solana');
    return {
      plugin: (mod as any).default ?? (mod as any).solanaPlugin,
      packageName: '@elizaos/plugin-solana',
    };
  } catch (primaryError) {
    try {
      const mod = await dynamicImport('@elizaos-plugins/plugin-solana');
      return {
        plugin: (mod as any).default ?? (mod as any).solanaPlugin,
        packageName: '@elizaos-plugins/plugin-solana',
      };
    } catch (fallbackError) {
      throw new Error(
        `Unable to load Solana plugin. Tried @elizaos/plugin-solana and @elizaos-plugins/plugin-solana. ` +
        `Primary: ${(primaryError as Error)?.message ?? String(primaryError)}. ` +
        `Fallback: ${(fallbackError as Error)?.message ?? String(fallbackError)}`,
      );
    }
  }
}

export async function startElizaRuntime(): Promise<any> {
  const g = getGlobalState();
  if (g[ELIZA_RUNTIME_FLAG]) return g[ELIZA_RUNTIME_FLAG];

  const AgentRuntimeCtor = (ElizaCore as any).AgentRuntime;
  const InMemoryDatabaseAdapterCtor = (ElizaCore as any).InMemoryDatabaseAdapter;
  const parseCharacter = (ElizaCore as any).parseCharacter;

  if (!AgentRuntimeCtor || !InMemoryDatabaseAdapterCtor || !parseCharacter) {
    throw new Error('Eliza core exports are unavailable in current runtime.');
  }

  process.env.ALLOW_NO_DATABASE = process.env.ALLOW_NO_DATABASE ?? 'true';

  const adapter = new InMemoryDatabaseAdapterCtor();
  await adapter.init();

  g[ELIZA_STARTUP_ERROR_FLAG] = undefined;
  g[ELIZA_REGISTERED_PLUGINS_FLAG] = [];
  g[ELIZA_REGISTERED_CLIENTS_FLAG] = [];

  try {
    const solana = await importSolanaPlugin();
    g[ELIZA_PLUGIN_PACKAGE_FLAG] = solana.packageName;

    g[ELIZA_RUNTIME_FLAG] = new AgentRuntimeCtor({
      character: buildElizaCharacter(parseCharacter, solana.packageName),
      adapter,
      plugins: solana.plugin ? [solana.plugin] : [],
      logLevel: 'info',
      checkShouldRespond: false,
    });

    if (solana.plugin) g[ELIZA_REGISTERED_PLUGINS_FLAG]?.push(solana.packageName);

    await g[ELIZA_RUNTIME_FLAG].initialize({ allowNoDatabase: true });

    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const telegramModule = await import('@elizaos/client-telegram');
        const telegramClient = (telegramModule as any).default ?? (telegramModule as any).TelegramClientInterface;

        if (telegramClient?.start) {
          await telegramClient.start(g[ELIZA_RUNTIME_FLAG]);
          g[ELIZA_REGISTERED_CLIENTS_FLAG]?.push('@elizaos/client-telegram');
          console.log('[Eliza] Telegram client started');
        }
      } catch (error) {
        console.warn('[Eliza] Telegram client failed to start:', error);
      }
    } else {
      console.log('[Eliza] Telegram client skipped (no TELEGRAM_BOT_TOKEN)');
    }

    console.log('[Eliza] Agent runtime initialized for Orion');
    return g[ELIZA_RUNTIME_FLAG];
  } catch (error) {
    g[ELIZA_STARTUP_ERROR_FLAG] = (error as Error)?.message ?? String(error);
    g[ELIZA_RUNTIME_FLAG] = null;
    throw error;
  }
}

export function getElizaRuntime(): any {
  return getGlobalState()[ELIZA_RUNTIME_FLAG] ?? null;
}

export function getElizaRuntimeDiagnostics() {
  const g = getGlobalState();
  return {
    runtimeActive: !!g[ELIZA_RUNTIME_FLAG],
    startupError: g[ELIZA_STARTUP_ERROR_FLAG],
    pluginPackage: g[ELIZA_PLUGIN_PACKAGE_FLAG],
    registeredPlugins: g[ELIZA_REGISTERED_PLUGINS_FLAG] ?? [],
    registeredClients: g[ELIZA_REGISTERED_CLIENTS_FLAG] ?? [],
  };
}
