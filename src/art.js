// Ilustraciones: usa las .webp de src/art/ si existen (se bajan al construir en el VPS);
// si no están, las carga directo desde Higgsfield.
import manifest from './art/manifest.json';

const ex = import.meta.glob('./art/ex/*.webp', { eager: true, query: '?url', import: 'default' });
const scenes = import.meta.glob('./art/scenes/*.webp', { eager: true, query: '?url', import: 'default' });
const byName = (files) => Object.fromEntries(Object.entries(files).map(([k, v]) => [k.split('/').pop().replace('.webp', ''), v]));
export const EX_ART = { ...manifest.ex, ...byName(ex) };
export const SCENE_ART = { ...manifest.scenes, ...byName(scenes) };
