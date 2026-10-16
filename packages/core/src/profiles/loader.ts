import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { ChannelProfileSchema, type ChannelProfile } from './schema.js';

export function parseProfile(yamlText: string): ChannelProfile {
  return ChannelProfileSchema.parse(parse(yamlText));
}

export function loadProfile(path: string): ChannelProfile {
  return parseProfile(readFileSync(path, 'utf8'));
}

export function loadProfiles(dir: string): Map<string, ChannelProfile> {
  const profiles = new Map<string, ChannelProfile>();
  for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
    const profile = loadProfile(join(dir, file));
    profiles.set(profile.id, profile);
  }
  return profiles;
}
