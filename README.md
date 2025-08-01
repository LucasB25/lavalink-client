<div style="font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 15px; padding: 25px; background-color: #f9f9f9;">

<h1 align="center" style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Lavalink Client</h1>
<p align="center" style="font-size: 1.2em; color: #555;">An easy, flexible, and feature-rich Lavalink v4 Client for both beginners and experts.</p>

<div align="center">
  <p>
    <img src="https://madewithlove.now.sh/at?heart=true&template=for-the-badge" alt="Made with love in Austria">
    <img alt="Made with TypeScript" src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white">
  </p>
  <p>
    <a href="https://www.npmjs.com/package/lavalink-client">
      <img src="https://img.shields.io/npm/v/lavalink-client.svg?maxAge=3600&style=for-the-badge&logo=npm&logoColor=red" alt="NPM Version" />
    </a>
    <a href="https://www.npmjs.com/package/lavalink-client">
      <img src="https://img.shields.io/npm/dt/lavalink-client.svg?maxAge=3600&style=for-the-badge&logo=npm&logoColor=red" alt="NPM Downloads" />
    </a>
    <a href="https://tomato6966.github.io/lavalink-client/">
      <img src="https://img.shields.io/badge/Documentation-%230288D1.svg?style=for-the-badge&logo=gitbook&logoColor=white" alt="Get Started Now">
    </a>
  </p>
  <p>
    <a href="https://www.npmjs.com/package/lavalink-client"><img src="https://nodei.co/npm/lavalink-client.png?downloads=true&stars=true" alt="NPM Install: lavalink-client" /></a>
  </p>
</div>

***

## 🚀 Features
- 💯 **Lavalink v4 Native:** Full support for Lavalink v4, including its powerful plugin ecosystem.
- ✅ **Detailed Player-Destroy Reasons:** Understand precisely why a player was destroyed (e.g., channel deleted, bot disconnected).
- ✨ **Flexible Queue Stores:** Use the default in-memory store or bring your own (Redis, databases, etc.) to sync queues across multiple processes.
- 🎶 **Unresolved Tracks:** Supports unresolved track objects, fetching full data only when a track is about to play, saving API requests and resources.
- 🎚️ **Built-in Filters & EQ:** Easy-to-use management for audio filters and equalizers.
- ⚙️ **Advanced Player Options:** Fine-tune player behavior for disconnects, empty queues, volume handling, and more.
- 🛡️ **Lavalink-Side Validation:** Ensures you only use filters, plugins, and sources that your Lavalink node actually supports.
- 🔒 **Client-Side Validation:** Whitelist and blacklist URLs or domains to prevent unwanted requests and protect your bot.
- 🧑‍💻 **Developer-Friendly:** A memory-efficient design with a clean, intuitive API that mirrors Lavalink's own implementation.
- 🤖 **Automated Handling:** Automatically handles track skipping on errors, voice channel deletions, server-wide mutes, and much more.

***

## 📦 Installation

**Latest Stable Version: `v2.5.x`**

<details>
<summary><strong>👉 via NPM</strong></summary>

```bash
# Stable
npm install --save lavalink-client

# Development
npm install --save tomato6966/lavalink-client
```

</details>

<details>
<summary><strong>👉 via YARN</strong></summary>

```bash
# Stable
yarn add lavalink-client

# Development
yarn add tomato6966/lavalink-client
```

</details>

***

## 📖 Documentation & Guides

- **[Full Documentation](https://tomato6966.github.io/lavalink-client/)** - Your starting point for everything.
- **[Manager Events](https://tomato6966.github.io/lavalink-client/extra/manager-events)** - Handle track, player, and general client events.
- **[NodeManager Events](https://tomato6966.github.io/lavalink-client/extra/node-events)** - Manage node connections, errors, and logs.
- **[Session Resuming Guide](https://tomato6966.github.io/lavalink-client/extra/resuming)** - Learn how to implement session resuming for seamless restarts.

***

## 💖 Used In
This client powers various Discord bots:
- **[Mivator](https://discord.gg/5dUb7M2qCj)** (Bot by @Tomato6966)
- **[Betty](https://betty.cx/)** (Bot by fb_sean)
- **Bots by Contributors:**
  - [Mintone](https://mintone.tech/) (@appujet)
  - [Stelle](https://github.com/Ganyu-Studios/stelle-music) (@EvilG-MC)
  - [Panais](https://panais.xyz/) (@LucasB25)
- **Bots Community:**
  - [Soundy](https://github.com/idMJA/Soundy) (@idMJA)

***

## 🛠️ Configuration Examples

### Basic Setup
A minimal example to get you started quickly.
```typescript
import { LavalinkManager } from "lavalink-client";
import { Client, GatewayIntentBits } from "discord.js"; // example for a discord bot

// Extend the Client type to include the lavalink manager
declare module "discord.js" {
    interface Client {
        lavalink: LavalinkManager;
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

client.lavalink = new LavalinkManager({
    nodes: [
        {
            authorization: "youshallnotpass", // The password for your Lavalink server
            host: "localhost",
            port: 2333,
            id: "Main Node",
        }
    ],
    // A function to send voice server updates to the Lavalink client
    sendToShard: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    },
    autoSkip: true,
    client: {
        id: process.env.CLIENT_ID, // Your bot's user ID
        username: "MyBot",
    },
});

// Listen for the 'raw' event from discord.js and forward it
client.on("raw", (d) => client.lavalink.sendRawData(d));

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    // Initialize the Lavalink client
    client.lavalink.init({ ...client.user });
});

client.login(process.env.DISCORD_TOKEN);
```

<details>
<summary><strong>🔩 Complete Configuration Example (All Options)</strong></summary>

```typescript
import { LavalinkManager, QueueChangesWatcher, QueueStoreManager, StoredQueue } from "lavalink-client";
import { RedisClientType, createClient } from "redis";
import { Client, GatewayIntentBits, User } from "discord.js";

// It's recommended to extend the Client type
declare module "discord.js" {
    interface Client {
        lavalink: LavalinkManager;
        redis: RedisClientType;
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

const previouslyUsedSessions = new Map<string, string>(); // Example: nodeManager.on("connect", node => previouslyUsedSessions.set(node.id, node.sessionId))

client.lavalink = new LavalinkManager({
    nodes: [
        {
            authorization: "youshallnotpass",
            host: "localhost",
            port: 2333,
            id: "testnode",
            sessionId: previouslyUsedSessions.get("testnode"), // For resuming
            secure: false, // Set to true for wss://
            retryAmount: 5,
            retryDelay: 10_000, // 10 seconds
        }
    ],
    sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
    autoSkip: true,
    client: {
        id: process.env.CLIENT_ID,
        username: "TESTBOT",
    },
    playerOptions: {
        applyVolumeAsFilter: false,
        clientBasedPositionUpdateInterval: 50,
        defaultSearchPlatform: "ytmsearch",
        volumeDecrementer: 0.75,
        onDisconnect: {
            autoReconnect: true,
            destroyPlayer: false,
        },
        onEmptyQueue: {
            destroyAfterMs: 30_000,
            // autoPlayFunction: async (player) => { /* ... */ },
        },
        useUnresolvedData: true,
    },
    queueOptions: {
        maxPreviousTracks: 10,
        queueStore: new MyCustomRedisStore(client.redis),
        queueChangesWatcher: new MyCustomQueueWatcher(client),
    },
    // Whitelist/Blacklist links or words
    linksAllowed: true,
    linksBlacklist: ["somebadsite.com"],
    linksWhitelist: [],
    advancedOptions: {
        debugOptions: {
            noAudio: false,
            playerDestroy: { dontThrowError: false, debugLog: false },
        }
    }
});

client.on("raw", d => client.lavalink.sendRawData(d));
client.on("ready", () => client.lavalink.init({ ...client.user }));

// Example Custom Redis Queue Store
class MyCustomRedisStore implements QueueStoreManager {
    private redis: RedisClientType;
    constructor(redisClient: RedisClientType) {
        this.redis = redisClient;
    }
    private key(guildId: string) { return `lavalinkqueue_${guildId}`; }
    async get(guildId: string) { return await this.redis.get(this.key(guildId)); }
    async set(guildId: string, data: string) { return await this.redis.set(this.key(guildId), data); }
    async delete(guildId: string) { return await this.redis.del(this.key(guildId)); }
    async parse(data: string): Promise<Partial<StoredQueue>> { return JSON.parse(data); }
    stringify(data: Partial<StoredQueue>): string { return JSON.stringify(data); }
}

// Example Custom Queue Watcher
class MyCustomQueueWatcher implements QueueChangesWatcher {
    private client: Client;
    constructor(client: Client) { this.client = client; }
    shuffled(guildId: string) { console.log(`Queue shuffled in guild: ${guildId}`); }
    tracksAdd(guildId: string, tracks: any[], position: number) { console.log(`${tracks.length} tracks added at position ${position} in guild: ${guildId}`); }
    tracksRemoved(guildId: string, tracks: any[], position: number) { console.log(`${tracks.length} tracks removed at position ${position} in guild: ${guildId}`); }
}
```

</details>

***

## 📢 Events
Listen to events to create interactive and responsive logic.

### Lavalink Manager Events
These events are emitted from the main `LavalinkManager` instance and relate to players and tracks.

- `playerCreate (player)`
- `playerDestroy (player, reason)`
- `playerDisconnect (player, voiceChannelId)`
- `playerMove (player, oldChannelId, newChannelId)`
- `trackStart (player, track)`
- `trackEnd (player, track)`
- `trackStuck (player, track, payload)`
- `trackError (player, track, payload)`
- `queueEnd (player)`

```javascript
// Example: Listening to a track start event
client.lavalink.on("trackStart", (player, track) => {
    const channel = client.channels.cache.get(player.textChannelId);
    if(channel) channel.send(`Now playing: ${track.info.title}`);
});

// Example: Handling queue end
client.lavalink.on("queueEnd", (player) => {
    const channel = client.channels.cache.get(player.textChannelId);
    if(channel) channel.send("The queue has finished. Add more songs!");
    player.destroy();
});
```

### Node Manager Events
These events are emitted from `lavalink.nodeManager` and relate to the Lavalink node connections.

- `create (node)`
- `connect (node)`
- `disconnect (node, reason)`
- `reconnecting (node)`
- `destroy (node)`
- `error (node, error, payload)`
- `resumed (node, payload, players)`

```javascript
// Example: Logging node connections and errors
client.lavalink.nodeManager.on("connect", (node) => {
  console.log(`Node "${node.id}" connected!`);
});

client.lavalink.nodeManager.on("error", (node, error) => {
  console.error(`Node "${node.id}" encountered an error:`, error.message);
});
```

***

## 📚 Advanced How-To Guides

### How to Implement Session Resuming
Resuming allows your music bot to continue playback even after a restart.

1.  **Enable Resuming on the Node:** When a node connects, enable resuming with a timeout.
2.  **Listen for the `resumed` Event:** This event fires on a successful reconnect, providing all player data from Lavalink.
3.  **Re-create Players:** Use the data from the `resumed` event and your own saved data (from a database/store) to rebuild the players and their queues.

> 💡 **For a complete, working example, see the [official test bot's implementation](https://github.com/Tomato6966/lavalink-client/blob/main/testBot/Utils/handleResuming.ts).**

```javascript
// 1. Enable resuming on connect
client.lavalink.nodeManager.on("connect", (node) => {
  // Enable resuming for 5 minutes (300,000 ms)
  node.updateSession(true, 300_000);
});

// 2. Listen for the resumed event
client.lavalink.nodeManager.on("resumed", async (node, payload, fetchedPlayers) => {
  console.log(`Node "${node.id}" successfully resumed with ${fetchedPlayers.length} players.`);

  for (const lavalinkData of fetchedPlayers) {
    // 3. Get your saved data (e.g., from Redis/DB)
    const savedData = await getFromDatabase(lavalinkData.guildId);
    if (!savedData || !lavalinkData.state.connected) {
        if(savedData) await deleteFromDatabase(lavalinkData.guildId);
        continue; // Skip if no saved data or Lavalink reports disconnected
    }

    // Re-create the player instance
    const player = client.lavalink.createPlayer({
        guildId: lavalinkData.guildId,
        voiceChannelId: savedData.voiceChannelId,
        textChannelId: savedData.textChannelId,
        // Important: Use the same node that was resumed
        node: node.id,
        // Set volume from Lavalink's data, accounting for the volume decrementer
        volume: lavalinkData.volume,
        selfDeaf: savedData.selfDeaf,
    });

    // Re-establish voice connection
    await player.connect();

    // Restore player state
    player.paused = lavalinkData.paused;
    player.lastPosition = lavalinkData.state.position;
    player.filterManager.data = lavalinkData.filters;

    // Restore the queue
    await player.queue.utils.sync(true, false); // Syncs with your QueueStore

    // Restore the current track
    if (lavalinkData.track) {
        player.queue.current = client.lavalink.utils.buildTrack(lavalinkData.track, savedData.requester);
    }
  }
});

// Persist player data on updates to use for resuming later
client.lavalink.on("playerUpdate", (oldPlayer, newPlayer) => {
    saveToDatabase(newPlayer.toJSON());
});

// Clean up data when a player is permanently destroyed
client.lavalink.on("playerDestroy", (player) => {
    deleteFromDatabase(player.guildId);
});
```

### How to Use Plugins (e.g., flowertts)
Pass extra parameters to the search function to use plugin-specific features.

```javascript
// Example for flowertts plugin
const query = interaction.options.getString("text");
const voice = interaction.options.getString("voice"); // e.g., "MALE_1"

const extraParams = new URLSearchParams();
if (voice) extraParams.append(`voice`, voice);

// All params for flowertts can be found here: https://flowery.pw/docs
const response = await player.search(
    {
      query: `${query}`,
      // This is used by plugins like ftts to adjust the request
      extraQueryUrlParams: extraParams,
      source: "ftts" // Specify the plugin source
    },
    interaction.user // The requester
);

// Add the TTS track to the queue
if (response.tracks.length > 0) {
    player.queue.add(response.tracks[0]);
    if (!player.playing) player.play();
}
```

</div>