import { env } from "@repo/env";
import { ShardingManager } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine extension based on whether we're running from src or dist
const ext = __dirname.includes('/dist/') ? '.js' : '.ts';
const botPath = path.join(__dirname, `bot${ext}`);

console.log('DISCORD_TOKEN:', env.DISCORD_TOKEN ? '✓ Found' : '✗ Not found');
console.log('Bot path:', botPath);

// Only use tsx for TypeScript files
const execArgv = ext === '.ts' ? ['--import', 'tsx'] : [];

const manager = new ShardingManager(botPath, { 
  token: env.DISCORD_TOKEN,
  totalShards: "auto",
  execArgv
});

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

manager.spawn()
	.then(shards => {
		shards.forEach(shard => {
			shard.on('message', message => {
				console.log(`Shard[${shard.id}] : ${message._eval} : ${message._result}`);
			});
		});
	})
	.catch(console.error);