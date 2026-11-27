(function (global) {
  'use strict';

  // Geometry is local to each part. The caller applies part.x / y / z.
  function rectangle(w, h) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(w / 2, h / 2);
    shape.lineTo(-w / 2, h / 2);
    shape.closePath();
    return shape;
  }

  function circularHole(shape, x, y, radius) {
    const path = new THREE.Path();
    path.absarc(x, y, radius, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }

  function capsuleHole(shape, x, y, width, height) {
    const r = height / 2, halfLine = Math.max(0, (width - height) / 2);
    const path = new THREE.Path();
    path.moveTo(x - halfLine, y - r);
    path.absarc(x - halfLine, y, r, -Math.PI / 2, -Math.PI * 1.5, true);
    path.lineTo(x + halfLine, y + r);
    path.absarc(x + halfLine, y, r, Math.PI / 2, -Math.PI / 2, true);
    path.closePath();
    shape.holes.push(path);
  }

  function extrude(shape, depth) {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: false,
      curveSegments: 20,
      steps: 1
    });
    geometry.translate(0, 0, -depth / 2);
    geometry.computeBoundingBox();
    return geometry;
  }

  function perforatedPanel(part) {
    const shape = rectangle(part.w, part.h);
    (part.holes || []).forEach(hole => {
      const r = Math.max(.01, Number(hole.r) || .3);
      if (Math.abs(hole.x) + r < part.w / 2 && Math.abs(hole.y) + r < part.h / 2) {
        circularHole(shape, hole.x, hole.y, r);
      }
    });
    return extrude(shape, part.d);
  }

  // Small manufactured edge easing catches a highlight without softening the
  // cabinet silhouette. A fixed grid spends vertices only around the edge;
  // the broad faces remain planar. Analytic normals keep the rounded return
  // smooth, including its corners, without averaging across a large face.
  // All six outer planes stay exactly at the specified part dimensions.
  function easedBox(part, radius) {
    const half = {x: part.w / 2, y: part.h / 2, z: part.d / 2};
    const inner = {x: half.x - radius, y: half.y - radius, z: half.z - radius};
    const grid = axis => [-half[axis], -inner[axis] - radius / 2, -inner[axis], inner[axis], inner[axis] + radius / 2, half[axis]];
    const faces = [
      {axis: 'x', sign: 1, u: 'z', v: 'y', flip: true},
      {axis: 'x', sign: -1, u: 'z', v: 'y', flip: false},
      {axis: 'y', sign: 1, u: 'x', v: 'z', flip: true},
      {axis: 'y', sign: -1, u: 'x', v: 'z', flip: false},
      {axis: 'z', sign: 1, u: 'x', v: 'y', flip: false},
      {axis: 'z', sign: -1, u: 'x', v: 'y', flip: true}
    ];
    const positions = [], normals = [], indices = [];
    faces.forEach(face => {
      const us = grid(face.u), vs = grid(face.v), offset = positions.length / 3;
      vs.forEach(v => us.forEach(u => {
        const point = {x: 0, y: 0, z: 0};
        point[face.axis] = face.sign * half[face.axis];
        point[face.u] = u;point[face.v] = v;
        const nearest = {}, normal = {};
        ['x', 'y', 'z'].forEach(axis => {
          nearest[axis] = Math.max(-inner[axis], Math.min(inner[axis], point[axis]));
          normal[axis] = point[axis] - nearest[axis];
        });
        const length = Math.hypot(normal.x, normal.y, normal.z);
        ['x', 'y', 'z'].forEach(axis => {
          normal[axis] /= length;
          positions.push(nearest[axis] + normal[axis] * radius);
          normals.push(normal[axis]);
        });
      }));
      for (let y = 0; y < vs.length - 1; y++) for (let x = 0; x < us.length - 1; x++) {
        const a = offset + y * us.length + x, b = a + 1, d = a + us.length, c = d + 1;
        if (face.flip) indices.push(a, c, b, a, d, c);
        else indices.push(a, b, c, a, c, d);
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.userData.edgeRadius = radius;
    geometry.computeBoundingBox();
    return geometry;
  }

  // Unwrap an eased cross-section by distance around its perimeter, avoiding
  // a projection switch inside the narrow edge band. The top/front broad
  // face retains its original physical UV coordinates.
  function roundedPerimeter(a, t, across, thickness, radius) {
    const ia = across / 2 - radius, it = thickness / 2 - radius, arc = Math.PI * radius / 2;
    if (t >= it && a >= -ia && a <= ia) return a + across / 2;
    if (a >= ia && t >= it) return across - radius + radius * Math.atan2(a - ia, t - it);
    if (a >= ia && t >= -it) return across - radius + arc + it - t;
    if (a >= ia) return across - radius + arc + 2 * it + radius * Math.atan2(-t - it, a - ia);
    if (t <= -it && a >= -ia) return across - radius + 2 * arc + 2 * it + ia - a;
    if (t <= -it) return across - radius + 2 * arc + 2 * it + 2 * ia + radius * Math.atan2(-a - ia, -t - it);
    if (t <= it) return across - radius + 3 * arc + 2 * it + 2 * ia + t + it;
    return across - radius + 3 * arc + 4 * it + 2 * ia + radius * Math.atan2(t - it, -a - ia);
  }

  function beveledPanel(part) {
    const bevel = Math.max(0, Math.min(Number(part.bevel) || 0, part.w / 4, part.h / 4, part.d / 4));
    if (!bevel) return new THREE.BoxGeometry(part.w, part.h, part.d);
    // Keep the established crisp cabinet chamfer. Subpixel rounded cabinet
    // edges can produce an unstable reflective rim at catalogue distances.
    const geometry = new THREE.ExtrudeGeometry(rectangle(part.w - 2 * bevel, part.h - 2 * bevel), {
      depth: part.d - 2 * bevel,
      bevelEnabled: true,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 1,
      curveSegments: 1,
      steps: 1
    });
    geometry.translate(0, 0, -part.d / 2 + bevel);
    geometry.computeBoundingBox();
    return geometry;
  }

  // The prototype has a full-size top, a thin straight edge and an inward
  // sloping underside. Keeping three rings preserves the specified outer size.
  function reverseBeveledTop(part) {
    const w = part.w, h = part.h, d = part.d;
    const rim = Math.min(Number(part.rim) || .5, h / 2);
    const inset = Math.min(Number(part.undersideInset) || 1.5, w / 4, d / 4);
    const ring = (width, depth, y) => [
      [-width / 2, y, -depth / 2], [width / 2, y, -depth / 2],
      [width / 2, y, depth / 2], [-width / 2, y, depth / 2]
    ];
    const rings = [ring(w, d, h / 2), ring(w, d, h / 2 - rim), ring(w - 2 * inset, d - 2 * inset, -h / 2)];
    const positions = [], uvs = [];
    function triangle(a, b, c, plane) {
      [a, b, c].forEach(point => {
        positions.push(point[0], point[1], point[2]);
        if (plane === 'top') uvs.push(point[0] / w + .5, point[2] / d + .5);
        else if (plane === 'side') uvs.push(point[2] / d + .5, point[1] / h + .5);
        else uvs.push(point[0] / w + .5, point[1] / h + .5);
      });
    }
    triangle(rings[0][0], rings[0][2], rings[0][1], 'top');
    triangle(rings[0][0], rings[0][3], rings[0][2], 'top');
    triangle(rings[2][0], rings[2][1], rings[2][2], 'top');
    triangle(rings[2][0], rings[2][2], rings[2][3], 'top');
    for (let level = 0; level < 2; level++) {
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4, a = rings[level][i], b = rings[level][j];
        const c = rings[level + 1][j], e = rings[level + 1][i];
        const plane = i % 2 ? 'side' : 'front';
        triangle(a, b, c, plane);
        triangle(a, c, e, plane);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
  }

  function connectorPlate(part) {
    const w = part.w, h = part.h, band = Math.min(Number(part.band) || 2.6, w / 2, h / 3);
    const left = -w / 2, right = w / 2, top = h / 2, bottom = -h / 2;
    const shape = new THREE.Shape();
    shape.moveTo(right, bottom);
    shape.lineTo(right, top);
    shape.lineTo(left, top);
    shape.lineTo(left, top - band);
    shape.lineTo(right - band, top - band);
    shape.lineTo(right - band, bottom);
    shape.closePath();
    capsuleHole(shape, left + Math.min(3.6, (w - band) / 2), top - band / 2, part.slotWidth || 4, part.slotHeight || .7);
    (part.holes || []).forEach(hole => circularHole(shape, hole.x, hole.y, hole.r || .3));
    return extrude(shape, part.d);
  }

  function insertRing(part) {
    const radius = part.w / 2, innerRadius = Math.min(part.innerRadius || .3, radius - .01);
    const shape = new THREE.Shape();
    shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    circularHole(shape, 0, 0, innerRadius);
    return extrude(shape, part.d);
  }

  // A closed glass sheet with a physically corrugated front, a planar rear
  // and sealed edges. The changing normals refract and reflect light; no
  // printed stripe texture is used. Eight millimetre pitch is provisional.
  function flutedGlass(part) {
    const columns = Math.max(12, Math.ceil(part.w / (part.ribPitch || .8)) * 12);
    const depth = Math.min(part.ribDepth || .12, part.d * .4), pitch = part.ribPitch || .8;
    const positions = [], indices = [];
    for (let side = 0; side < 2; side++) {
      for (let row = 0; row < 2; row++) for (let column = 0; column <= columns; column++) {
        const x = -part.w / 2 + part.w * column / columns;
        const wave = (.5 + .5 * Math.cos(2 * Math.PI * x / pitch));
        positions.push(x, (row - .5) * part.h, side === 0 ? part.d / 2 - depth * (1 - wave) : -part.d / 2);
      }
    }
    const stride = columns + 1, rear = stride * 2;
    function quad(a, b, c, d) { indices.push(a, b, c, a, c, d); }
    for (let i = 0; i < columns; i++) {
      quad(i, i + 1, stride + i + 1, stride + i);
      quad(rear + i, rear + stride + i, rear + stride + i + 1, rear + i + 1);
      quad(i, rear + i, rear + i + 1, i + 1);
      quad(stride + i, stride + i + 1, rear + stride + i + 1, rear + stride + i);
    }
    quad(0, stride, rear + stride, rear);
    quad(columns, rear + columns, rear + stride + columns, stride + columns);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();
    return geometry;
  }

  function build(part) {
    if (!part || ![part.w, part.h, part.d].every(value => Number.isFinite(value) && value > 0)) {
      throw new Error('Parça boyutları pozitif sayı olmalı.');
    }
    if (part.kind === 'led-wash') {
      // Light is baked onto the actual inside surfaces. These one-sided,
      // two-triangle receivers add no shadow lights or external glow cards.
      let geometry;
      if (part.surface === 'floor') {
        geometry = new THREE.PlaneGeometry(part.w, part.d);
        geometry.rotateX(-Math.PI / 2);
      } else if (part.surface === 'left' || part.surface === 'right') {
        geometry = new THREE.PlaneGeometry(part.d, part.h);
        geometry.rotateY(part.surface === 'left' ? Math.PI / 2 : -Math.PI / 2);
      } else geometry = new THREE.PlaneGeometry(part.w, part.h);
      const spill = part.surface === 'left' || part.surface === 'right' ? .55 : 1;
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(geometry.getAttribute('position').count * 3).fill(spill), 3));
      geometry.computeBoundingBox();
      return geometry;
    }
    if (part.shape === 'fluted-glass') return flutedGlass(part);
    if (part.shape === 'perforated-panel') return perforatedPanel(part);
    if (part.shape === 'reverse-beveled-panel' || part.name === 'Span üst tablası') return reverseBeveledTop(part);
    if (part.shape === 'connector-plate') return connectorPlate(part);
    if (part.shape === 'insert-ring') return insertRing(part);
    if (part.shape === 'bolt-head') {
      const geometry = new THREE.CylinderGeometry(part.w / 2, part.w / 2, part.d, 6);
      geometry.rotateX(Math.PI / 2);
      return geometry;
    }
    if (part.shape === 'beveled-panel') return beveledPanel(part);
    // Four tenths of a millimetre on the remaining timber support/leg edges.
    // Hardware, glass, mounting perforations and the span profile use their
    // original geometry above and never pass through this easing step.
    if (['body', 'front', 'shelf', 'support', 'leg'].includes(part.kind)) {
      return easedBox(part, Math.min(.04, part.w / 4, part.h / 4, part.d / 4));
    }
    return new THREE.BoxGeometry(part.w, part.h, part.d);
  }

  function make(part) {
    const geometry = build(part);
    if (['hardware','glass','recess','led','led-wash'].includes(part.kind)) return geometry;
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = [];
    const size = {x: part.w, y: part.h, z: part.d};
    const axes = ['x', 'y', 'z'].sort((a, b) => size[b] - size[a]);
    const grain = axes[0], across = axes[1], thickness = axes[2];
    const alongCm = 120, acrossCm = 60;
    const assembly = part.assembly || (part.upper >= 0 ? 'upper-' + part.upper : part.module >= 0 ? 'box-' + part.module : 'span');
    const leafKey = assembly + ':' + (part.name || '') + (part.name === 'Çekmece önü' ? ':' + Math.round(part.y * 100) : '');
    let seed = 2166136261;
    for (let i = 0; i < leafKey.length; i++) seed = Math.imul(seed ^ leafKey.charCodeAt(i), 16777619) >>> 0;
    // The square scan is a physical veneer leaf: horizontal image grain runs
    // along U. Stable leaf phases vary pieces without depending on placement.
    const phaseU = part.kind === 'top' ? 0 : (seed & 65535) / 65536 * .3;
    const phaseV = (seed >>> 16) / 65536 * .5;
    for (let i = 0; i < position.count; i++) {
      const p = {x: position.getX(i), y: position.getY(i), z: position.getZ(i)};
      const n = {x: normal.getX(i), y: normal.getY(i), z: normal.getZ(i)};
      const nx = Math.abs(n.x), ny = Math.abs(n.y), nz = Math.abs(n.z);
      const face = ny >= nx && ny >= nz ? 'y' : nx > nz ? 'x' : 'z';
      let u, v;
      if (face === grain) {
        // End grain uses the longest axis within that end face.
        u = (p[across] + size[across] / 2) / alongCm;
        v = (p[thickness] + size[thickness] / 2) / acrossCm;
      } else {
        u = (p[grain] + size[grain] / 2) / alongCm;
        const a = p[across] + size[across] / 2, t = p[thickness] + size[thickness] / 2;
        // Unfold the narrow edge band around the broad panel. The visible
        // broad face and its long edges share the same grain phase and scale.
        if (geometry.userData.edgeRadius) v = roundedPerimeter(p[across], p[thickness], size[across], size[thickness], geometry.userData.edgeRadius);
        else if (face === thickness) v = n[thickness] >= 0 ? a : size[across] + size[thickness] + size[across] - a;
        else v = n[across] >= 0 ? size[across] + size[thickness] - t : 2 * size[across] + size[thickness] + t;
        v /= acrossCm;
      }
      // Unbounded UVs retain physical scale; texture wrapping belongs to the
      // material. Per-vertex clamping would stretch the veneer into seams.
      uv.push(u + phaseU, v + phaseV);
    }
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return geometry;
  }

  // Approximate visible hardware from the 21 August prototype video. This is
  // a rear fixing plate, not a continuous sliding rail or a load specification.
  function connectionParts(config, layout) {
    if (!layout || !Array.isArray(layout.parts) || (config && config.spanEnabled === false)) return [];
    const top = layout.parts.find(part => part.name === 'Span üst tablası');
    const support = layout.parts.find(part => part.name === 'Span ara desteği');
    if (!top || !support) return [];
    const backs = layout.parts.filter(part => part.kind === 'back' && part.module >= 0 && part.shape === 'perforated-panel' && part.holes && part.holes.length);
    if (!backs.length) return [];
    const back = backs.reduce((nearest, candidate) => {
      const gap = part => Math.max(0, Math.abs(support.x - part.x) - part.w / 2);
      return gap(candidate) < gap(nearest) ? candidate : nearest;
    });
    const nearestHole = back.holes.reduce((a, b) => Math.abs(back.x + b.x - support.x) < Math.abs(back.x + a.x - support.x) ? b : a);
    const column = back.x + nearestHole.x;
    const holeYs = back.holes.filter(hole => Math.abs(hole.x - nearestHole.x) < .001).map(hole => back.y + hole.y).sort((a, b) => a - b);
    if (holeYs.length < 2) return [];
    const width = 10, band = 2.6, plateTop = top.y + band / 2, plateBottom = holeYs[0] - 2;
    const height = plateTop - plateBottom, centerY = (plateTop + plateBottom) / 2;
    const stemCenter = width / 2 - band / 2, centerX = column - stemCenter;
    const z = back.z - back.d / 2 - .15;
    const common = {kind: 'hardware', module: back.module, assembly: 'span', provisional: true};
    const parts = [{
      ...common, name: 'Arka L bağlantı plakası', shape: 'connector-plate',
      w: width, h: height, d: .25, band: band, x: centerX, y: centerY, z: z,
      slotWidth: 4, slotHeight: .7, finish: 'black-metal',
      holes: holeYs.map(y => ({x: stemCenter, y: y - centerY, r: .3}))
    }];
    holeYs.forEach((y, index) => parts.push({
      ...common, name: 'Arka bağlantı cıvatası ' + (index + 1), shape: 'bolt-head',
      w: .9, h: .9, d: .3, x: column, y: y, z: z - .25, finish: 'steel'
    }));
    parts.push({
      ...common, name: 'Tabla bağlantı cıvatası', shape: 'bolt-head',
      w: .9, h: .9, d: .3, x: centerX - width / 2 + 3.6, y: top.y, z: z - .25, finish: 'steel'
    });
    return parts;
  }

  function insertParts(layout) {
    if (!layout || !Array.isArray(layout.parts)) return [];
    const parts = [];
    layout.parts.filter(part => part.shape === 'perforated-panel' && (part.module >= 0 || part.upper >= 0) && Array.isArray(part.holes)).forEach(back => {
      back.holes.forEach(hole => parts.push({
        name: 'Arka bağlantı inserti', shape: 'insert-ring',
        w: .9, h: .9, d: .14, innerRadius: hole.r || .3,
        x: back.x + hole.x, y: back.y + hole.y, z: back.z - back.d / 2 - .07,
        kind: 'hardware', finish: 'black-metal', assembly: back.assembly, module: back.module, upper: back.upper,
        provisional: true
      }));
    });
    return parts;
  }

  // A concealed 3000 K diffuser below each compartment ceiling. Only actual
  // reeded-glass assemblies qualify; opaque doors and open shelves never do.
  // Small surface receivers approximate diffuse bounce without allocating a
  // light or a shadow map per cabinet. All additions stay inside the carcass.
  function interiorLEDParts(layoutOrParts) {
    const source = Array.isArray(layoutOrParts) ? layoutOrParts : layoutOrParts && layoutOrParts.parts;
    if (!Array.isArray(source)) return [];
    const parts = [], assemblies = new Set(source.filter(part => part.kind === 'glass' && part.shape === 'fluted-glass').map(part => part.assembly));
    assemblies.forEach(assembly => {
      const cabinet = source.filter(part => part.assembly === assembly && !part.illumination);
      const glass = cabinet.find(part => part.kind === 'glass' && part.shape === 'fluted-glass');
      const back = cabinet.find(part => part.kind === 'back');
      const horizontals = cabinet.filter(part => part.kind === 'body' && part.h < part.w && part.h < part.d);
      if (!glass || !back || horizontals.length < 2) return;
      horizontals.sort((a, b) => a.y - b.y);
      const bottom = horizontals[0], top = horizontals[horizontals.length - 1];
      const shelves = cabinet.filter(part => part.kind === 'shelf').sort((a, b) => a.y - b.y);
      const levels = [bottom, ...shelves, top], left = back.x - back.w / 2, right = back.x + back.w / 2;
      const rear = back.z + back.d / 2, front = glass.z - glass.d / 2 - .5;
      const common = {assembly, module: glass.module, upper: glass.upper, illumination: true, castShadow: false, receiveShadow: false, temperatureK: 3000, provisional: true};
      for (let i = 0; i < levels.length - 1; i++) {
        const floor = levels[i], ceiling = levels[i + 1];
        const low = floor.y + floor.h / 2, high = ceiling.y - ceiling.h / 2;
        const height = high - low, width = right - left, depth = front - rear;
        if (height < 2 || width < 5 || depth < 3) continue;
        // Keep each diffuser just behind its own shelf lip. A deeper recess
        // lets the shelf conceal the lower LEDs at the normal viewing angle.
        const slotZ = Math.min(front - .9, ceiling.z + ceiling.d / 2 - .45);
        const id = { ...common, compartment: i };
        parts.push({...id, kind: 'led', name: 'Gizli iç LED difüzörü', w: width - 3.4, h: .38, d: .56, x: back.x, y: high - .32, z: slotZ});
        const wash = {...id, kind: 'led-wash', name: 'İç LED ışık yansıması'};
        // A small physical offset prevents coplanar flicker; the gradient
        // fades before the receiver edge, so it never paints a luminous rim.
        parts.push({...wash, surface: 'back', w: width - .18, h: height - .12, d: .01, x: back.x, y: (high + low) / 2, z: rear + .025});
        const floorRear = Math.max(rear, floor.z - floor.d / 2), floorFront = Math.min(front, floor.z + floor.d / 2);
        parts.push({...wash, surface: 'floor', w: Math.min(width, floor.w) - .18, h: .01, d: floorFront - floorRear - .18, x: back.x, y: low + .025, z: (floorFront + floorRear) / 2});
        for (const side of ['left', 'right']) parts.push({...wash, surface: side, w: .01, h: height - .12, d: depth - .18, x: side === 'left' ? left + .025 : right - .025, y: (high + low) / 2, z: (rear + front) / 2});
      }
    });
    return parts;
  }

  const api = {make: make, connectionParts: connectionParts, insertParts: insertParts, interiorLEDParts: interiorLEDParts};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AdopGeometry = api;
})(typeof window !== 'undefined' ? window : globalThis);
