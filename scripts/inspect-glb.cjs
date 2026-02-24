const fs = require('fs');
const buf = fs.readFileSync('public/models/animations/jbd-bot.glb');

const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf-8'));

console.log('=== ANIMATIONS ===');
if (json.animations) {
  json.animations.forEach((a, i) => {
    console.log(`  [${i}] "${a.name || '(unnamed)'}" channels:${a.channels?.length || 0}`);
  });
} else {
  console.log('  (none)');
}

console.log('\n=== NODES (first 50) ===');
if (json.nodes) {
  json.nodes.slice(0, 50).forEach((n, i) => {
    const parts = [];
    if (n.mesh != null) parts.push(`mesh:${n.mesh}`);
    if (n.skin != null) parts.push(`skin:${n.skin}`);
    if (n.children) parts.push(`children:[${n.children.join(',')}]`);
    console.log(`  [${i}] "${n.name || '(unnamed)'}" ${parts.join(' ')}`);
  });
  if (json.nodes.length > 50) console.log(`  ... (${json.nodes.length} total nodes)`);
}

console.log('\n=== MESHES ===');
if (json.meshes) {
  json.meshes.forEach((m, i) => {
    console.log(`  [${i}] "${m.name || '(unnamed)'}" primitives:${m.primitives.length}`);
  });
}

console.log('\n=== SKINS ===');
if (json.skins) {
  json.skins.forEach((s, i) => {
    console.log(`  [${i}] "${s.name || '(unnamed)'}" joints:${s.joints?.length || 0}`);
  });
}

console.log('\n=== SCENES ===');
if (json.scenes) {
  json.scenes.forEach((s, i) => {
    console.log(`  [${i}] "${s.name || '(unnamed)'}" nodes:[${(s.nodes || []).join(',')}]`);
  });
}
