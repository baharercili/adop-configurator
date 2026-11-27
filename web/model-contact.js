(function (global) {
  'use strict';
  const layouts = new WeakMap(), prepared = new WeakMap(), decorated = new WeakSet();
  const ATTR = ['adopContactLocal', 'adopContactBounds', 'adopContactJoints'];
  const VERSION = 'adop-contact-v1', T = 1.2, HALF_T = .6, FAR = 10000, EPS = .13;
  const finite = value => Number.isFinite(value);
  const near = (a, b, tolerance = .025) => Math.abs(a - b) <= tolerance;

  function signature(c) {
    return JSON.stringify([c.modules, c.upper, c.span, c.spanEnabled, c.spanOffset]);
  }
  function record(config) {
    if (!config || typeof config !== 'object' || !global.AdopConfig) return null;
    try {
      const stamp = signature(config), cached = layouts.get(config);
      if (cached && cached.stamp === stamp) return cached;
      const canonical = global.AdopConfig.clean(config), layout = global.AdopConfig.layout(canonical), value = {stamp, config: canonical, layout, descriptors: new Map()};
      layouts.set(config, value);return value;
    } catch (_) { return null; }
  }
  function eligible(part) {
    return part && ['body', 'shelf', 'back'].includes(part.kind) && part.assembly !== 'span' &&
      !part.illumination && !/^Cam kapak /.test(part.name || '') &&
      [part.w, part.h, part.d].every(value => finite(value) && value > 0);
  }
  function descriptor(part, config) {
    if (!eligible(part)) return null;
    const c = part._config || config, cached = record(c);
    if (!cached) return null;
    const layout = cached.layout, upper = Number.isInteger(part.upper) && part.upper >= 0;
    const index = upper ? part.upper : part.module;
    if (!Number.isInteger(index) || index < 0) return null;
    const assembly = (upper ? 'upper-' : 'box-') + index;
    if (part.assembly && part.assembly !== assembly) return null;
    let box = cached.descriptors.get(assembly);
    if (box === undefined) {
      const item = upper ? layout.upper && layout.upper[index] : cached.config.modules && cached.config.modules[index];
      if (!item || upper && item.type !== 'UW') { cached.descriptors.set(assembly, null);return null; }
      const dimensions = upper ? global.AdopConfig.upperDimensions(item) : {width: item.width, height: 40, depth: 45};
      const width = dimensions.width, height = dimensions.height, depth = dimensions.depth;
      const x = layout.left + item.x + width / 2, y = upper ? item.y : 0, z = upper ? -22.5 + depth / 2 : 0;
      const parts = layout.parts.filter(p => p.assembly === assembly), back = parts.find(p => p.kind === 'back');
      if (!back || ![x, y, z, width, height, depth].every(finite)) { cached.descriptors.set(assembly, null);return null; }
      const halfWidth = width / 2 - T, backZ = back.z + back.d / 2 - z;
      const shelves = parts.filter(p => p.kind === 'shelf').sort((a, b) => a.y - b.y);
      const dividers = parts.filter(p => p.kind === 'body' && near(p.w, T) && p.h >= height - 2 * T - .03 && Math.abs(p.x - x) < halfWidth - HALF_T);
      let flags = 0, dividerFront = 0, valid = dividers.length <= 1 && shelves.length <= 2;
      if (dividers.length) {
        const divider = dividers[0];
        valid = valid && near(divider.x, x) && divider.z - divider.d / 2 <= z + backZ + EPS;
        flags = 1;dividerFront = divider.z + divider.d / 2 - z;
      }
      let shelfMode = 0, rear = 0, front = 0;
      if (shelves.length) {
        const first = shelves[0], left = first.x - first.w / 2 - x, right = first.x + first.w / 2 - x;
        shelfMode = near(left, -halfWidth) && near(right, halfWidth) ? 2 : flags && near(left, HALF_T) && near(right, halfWidth) ? 4 : 0;
        valid = valid && shelfMode > 0;
        rear = first.z - first.d / 2 - z;front = first.z + first.d / 2 - z;
        valid = valid && shelves.every(p => near(p.h, T) && near(p.x, first.x) && near(p.w, first.w) && near(p.z, first.z) && near(p.d, first.d));
        flags += shelfMode;
      }
      box = valid ? {assembly, front: item.front, x, y, z, width, height, depth, parts,
        bounds: [halfWidth, height - T, backZ, dividerFront],
        joints: [shelves[0] ? shelves[0].y - y : FAR, shelves[1] ? shelves[1].y - y : FAR, rear, front], flags} : null;
      cached.descriptors.set(assembly, box);
    }
    if (!box) return null;
    const candidates = box.parts.filter(p => p.name === part.name && p.kind === part.kind && near(p.w, part.w) && near(p.h, part.h) && near(p.d, part.d));
    if (!candidates.length) return null;
    // The canonical local offset is translation invariant. It covers normal
    // C.layout parts, landing x-left snapshots and a temporary editor origin.
    let source;
    const occurrence = part._id && Number(String(part._id).split(':').pop());
    if (Number.isInteger(occurrence) && occurrence >= 0 && candidates[occurrence]) source = candidates[occurrence];
    else source = candidates.reduce((a, b) => Math.abs(b.y - part.y) < Math.abs(a.y - part.y) ? b : a);
    return {box, center: [source.x - box.x, source.y - box.y, source.z - box.z]};
  }
  function key(part, config) {
    const value = descriptor(part, config);
    if (!value) return VERSION + ':none';
    const {box, center} = value;
    return JSON.stringify([VERSION, part.name, part.kind, part.shape, part.w, part.h, part.d, box.assembly, box.front, box.width, box.height, box.depth, center, box.bounds, box.joints, box.flags]);
  }
  function prepare(geometry, part, config) {
    if (!geometry || !geometry.getAttribute || !global.THREE) return geometry;
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    if (!position) return geometry;
    const value = descriptor(part, config), stamp = key(part, config);
    if (prepared.get(geometry) === stamp) return geometry;
    // Excluded meshes use the material's constant-zero vertex defaults.
    // Glass and small metal inserts can have many vertices; allocating three
    // zero arrays for them would spend more memory than all real cavity data.
    if (!value || !normal || normal.count !== position.count) {
      ATTR.forEach(name => geometry.deleteAttribute(name));
      if (value) prepared.delete(geometry);else prepared.set(geometry, stamp);
      return geometry;
    }
    const local = new Float32Array(position.count * 4), bounds = new Float32Array(position.count * 4), joints = new Float32Array(position.count * 4);
    const {box, center} = value;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) + center[0], y = position.getY(i) + center[1], z = position.getZ(i) + center[2];
        const nx = normal.getX(i), ny = normal.getY(i), nz = normal.getZ(i);
        let axis = 0;
        // Gate only the surface's own plane here. Full cavity limits belong
        // in the fragment: broad side-face corner vertices lie outside them.
        if (Math.abs(nx) > .995 && x >= -box.bounds[0] - EPS && x <= box.bounds[0] + EPS) axis = 1;
        else if (Math.abs(ny) > .995 && y >= T - EPS && y <= box.bounds[1] + EPS) axis = 2;
        else if (nz > .995 && part.kind === 'back' && near(z, box.bounds[2], EPS)) axis = 3;
        const offset = i * 4;
        local.set([x, y, z, box.flags * 4 + axis], offset);
        bounds.set(box.bounds, offset);joints.set(box.joints, offset);
    }
    ATTR.forEach((name, i) => geometry.setAttribute(name, new global.THREE.BufferAttribute([local, bounds, joints][i], 4)));
    prepared.set(geometry, stamp);
    return geometry;
  }

  const vertexDeclarations = `
attribute vec4 adopContactLocal;
attribute vec4 adopContactBounds;
attribute vec4 adopContactJoints;
varying vec4 vAdopContactLocal;
varying vec4 vAdopContactBounds;
varying vec4 vAdopContactJoints;
`;
  const vertexAssignment = `
vAdopContactLocal = adopContactLocal;
vAdopContactBounds = adopContactBounds;
vAdopContactJoints = adopContactJoints;
`;
  const fragmentDeclarations = `
varying vec4 vAdopContactLocal;
varying vec4 vAdopContactBounds;
varying vec4 vAdopContactJoints;
float adopContactFalloff( float distanceCm ) {
  return 1.0 - smoothstep( 0.0, 1.6, max( distanceCm, 0.0 ) );
}
float adopContactFactor() {
  float flags = floor( vAdopContactLocal.w / 4.0 + 0.0001 );
  float axis = vAdopContactLocal.w - flags * 4.0;
  vec3 p = vAdopContactLocal.xyz;
  vec4 b = vAdopContactBounds;
  if ( axis < 0.5 || b.x < 0.5 || b.y <= 1.2 ||
       abs( p.x ) > b.x + 0.02 || p.y < 1.18 || p.y > b.y + 0.02 || p.z < b.z - 0.02 ) return 1.0;
  float divider = mod( flags, 2.0 );
  float shelfMode = floor( flags / 2.0 );
  vec3 distanceCm = vec3( b.x - abs( p.x ), min( p.y - 1.2, b.y - p.y ), p.z - b.z );
  if ( divider > 0.5 ) {
    float dividerDistance = length( vec2( max( abs( p.x ) - 0.6, 0.0 ), max( p.z - b.w, 0.0 ) ) );
    distanceCm.x = min( distanceCm.x, dividerDistance );
  }
  if ( shelfMode > 0.5 ) {
    vec4 shelf = vAdopContactJoints;
    float outsideDepth = max( max( shelf.z - p.z, p.z - shelf.w ), 0.0 );
    float outsideWidth = shelfMode > 1.5 ? max( 0.6 - p.x, 0.0 ) : 0.0;
    float shelf0 = max( abs( p.y - shelf.x ) - 0.6, 0.0 );
    float shelf1 = max( abs( p.y - shelf.y ) - 0.6, 0.0 );
    distanceCm.y = min( distanceCm.y, length( vec3( min( shelf0, shelf1 ), outsideDepth, outsideWidth ) ) );
  }
  vec3 occlusion = vec3( adopContactFalloff( distanceCm.x ), adopContactFalloff( distanceCm.y ), adopContactFalloff( distanceCm.z ) );
  // A face never shadows itself. Only adjacent real planes contribute.
  if ( axis < 1.5 ) occlusion.x = 0.0;
  else if ( axis < 2.5 ) occlusion.y = 0.0;
  else occlusion.z = 0.0;
  return max( 0.72, 1.0 - 0.14 * ( occlusion.x + occlusion.y + occlusion.z ) );
}
`;
  const fragmentAssignment = `
float adopContactAO = adopContactFactor();
reflectedLight.indirectDiffuse *= adopContactAO;
reflectedLight.indirectSpecular *= mix( 1.0, adopContactAO, 0.6 );
`;
  function decorateMaterial(material) {
    if (!material || decorated.has(material) || !(material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) return material;
    const previousCompile = material.onBeforeCompile, previousKey = material.customProgramCacheKey;
    material.defaultAttributeValues = Object.assign({}, material.defaultAttributeValues, {
      adopContactLocal: [0, 0, 0, 0], adopContactBounds: [0, 0, 0, 0], adopContactJoints: [0, 0, 0, 0]
    });
    material.onBeforeCompile = function (shader, renderer) {
      if (previousCompile) previousCompile.call(this, shader, renderer);
      if (!shader.vertexShader.includes('#include <begin_vertex>') || !shader.fragmentShader.includes('#include <aomap_fragment>')) return;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + vertexDeclarations)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + vertexAssignment);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + fragmentDeclarations)
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + fragmentAssignment);
    };
    material.customProgramCacheKey = function () { return (previousKey ? previousKey.call(this) : '') + '|' + VERSION; };
    decorated.add(material);material.needsUpdate = true;
    return material;
  }
  const api = {prepare, decorateMaterial, key};
  global.AdopContact = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
