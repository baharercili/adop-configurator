(function (global) {
'use strict';
const C=global.AdopConfig;
const items=[
  {
    "id": "cizim-01-yatay-duzen",
    "combinationSku": "KMB-LG-01",
    "name": "ADØP TV ünitesi 329,1 cm",
    "note": "4 × 60 cm düz kapaklı base modül, 180 cm adapte edilebilir tabla, 45 cm açık duvar modül, 120 cm raf.",
    "source": "Çiziminden",
    "featured": true,
    "collection": "wall",
    "intent": "Uzun bir duvarı, yatay depolama ve açık üst rafla birlikte değerlendir.",
    "tags": [
      "wall",
      "storage",
      "airy"
    ],
    "widths": [
      60,
      60,
      60,
      60
    ],
    "fronts": [
      "plain",
      "plain",
      "plain",
      "plain"
    ],
    "span": 180,
    "spanEnabled": true,
    "spanOffset": 149.1,
    "upper": [
      {
        "type": "UW",
        "width": 45,
        "front": "open",
        "x": 30,
        "y": 140
      },
      {
        "type": "WS",
        "width": 120,
        "front": "open",
        "x": 75,
        "y": 156.6
      }
    ],
    "bodyFinish": "oak",
    "frontFinish": "cream",
    "spanFinish": "oak"
  },
  {
    "id": "cizim-02-derin-depolama",
    "combinationSku": "KMB-LG-02",
    "name": "ADØP TV ünitesi 250 cm",
    "note": "60 cm düz kapaklı base modül, 120 cm derin çekmeceli base modül, 180 cm adapte edilebilir tabla, 36 × 36 × 90 cm dikey duvar modül ve 120 cm raf.",
    "source": "Çiziminden",
    "featured": true,
    "collection": "storage",
    "intent": "Geniş bir çekmeceyi, kapalı depolama ve uzayan yüzeyle birleştir.",
    "tags": [
      "storage",
      "airy",
      "wall"
    ],
    "widths": [
      60,
      120
    ],
    "fronts": [
      "plain",
      "deep-drawer"
    ],
    "span": 180,
    "spanEnabled": true,
    "spanOffset": 70,
    "upper": [
      {
        "type": "UW",
        "width": 36,
        "front": "vertical",
        "x": 15,
        "y": 90
      },
      {
        "type": "WS",
        "width": 120,
        "front": "open",
        "x": 70,
        "y": 177.2
      }
    ],
    "bodyFinish": "oak",
    "frontFinish": "cream",
    "spanFinish": "oak"
  },
  {
    "id": "cizim-03-acik-uc",
    "combinationSku": "KMB-LG-03",
    "name": "ADØP TV ünitesi 202,5 cm",
    "note": "90 cm derin çekmeceli base modül, 45 cm açık base modül, 180 cm adapte edilebilir tabla, 120 cm raf.",
    "source": "Çiziminden",
    "featured": true,
    "collection": "airy",
    "intent": "Günlük eşyalar için açık bir göz bırakırken çekmecenin depolamasını koru.",
    "tags": [
      "airy",
      "storage",
      "wall"
    ],
    "widths": [
      90,
      45
    ],
    "fronts": [
      "deep-drawer",
      "open"
    ],
    "span": 180,
    "spanEnabled": true,
    "spanOffset": 22.5,
    "upper": [
      {
        "type": "WS",
        "width": 120,
        "front": "open",
        "x": 22.5,
        "y": 140
      }
    ],
    "bodyFinish": "oak",
    "frontFinish": "cream",
    "spanFinish": "oak"
  },
  {
    "id": "tek-modul",
    "combinationSku": "KMB-LG-04",
    "name": "ADØP TV ünitesi 90 cm",
    "note": "90 cm düşer kapaklı base modül.",
    "collection": "compact",
    "intent": "Tek bir kutuyla başla; ihtiyaç duydukça düzenine yeni parçalar ekle.",
    "tags": [
      "compact"
    ],
    "widths": [
      90
    ],
    "fronts": [
      "drop"
    ],
    "span": 180,
    "spanEnabled": false,
    "spanOffset": 0,
    "upper": [],
    "bodyFinish": "oak",
    "frontFinish": "oak",
    "spanFinish": "oak"
  },
  {
    "id": "dengeli-ikili",
    "combinationSku": "KMB-LG-05",
    "name": "ADØP TV ünitesi 120 cm",
    "note": "2 × 60 cm düz kapaklı base modül.",
    "collection": "compact",
    "intent": "Farklı ön yüzleri aynı renkte, sakin bir depolama düzeninde buluştur.",
    "tags": [
      "compact",
      "storage"
    ],
    "widths": [
      60,
      60
    ],
    "fronts": [
      "plain",
      "plain"
    ],
    "span": 180,
    "spanEnabled": false,
    "spanOffset": 0,
    "upper": [],
    "bodyFinish": "cream",
    "frontFinish": "cream",
    "spanFinish": "oak"
  },
  {
    "id": "kompakt-uzanti",
    "combinationSku": "KMB-LG-06",
    "name": "ADØP TV ünitesi 120 cm",
    "note": "60 cm düz kapaklı base modül, 120 cm adapte edilebilir tabla.",
    "collection": "compact",
    "intent": "Küçük bir duvarda depolamanın yanında açık bir alan bırak.",
    "tags": [
      "compact",
      "airy"
    ],
    "widths": [
      60
    ],
    "fronts": [
      "plain"
    ],
    "span": 120,
    "spanEnabled": true,
    "spanOffset": 0,
    "upper": [],
    "bodyFinish": "oak",
    "frontFinish": "oak",
    "spanFinish": "oak"
  },
  {
    "id": "hafif-uzanti",
    "combinationSku": "KMB-LG-07",
    "name": "ADØP TV ünitesi 180 cm",
    "note": "60 cm düz kapaklı base modül, 180 cm adapte edilebilir tabla.",
    "collection": "airy",
    "intent": "Az depolamayla geniş bir yüzey ve belirgin bir boşluk oluştur.",
    "tags": [
      "airy"
    ],
    "widths": [
      60
    ],
    "fronts": [
      "plain"
    ],
    "span": 180,
    "spanEnabled": true,
    "spanOffset": 0,
    "upper": [],
    "bodyFinish": "oak",
    "frontFinish": "cream",
    "spanFinish": "oak"
  },
  {
    "id": "acik-kapali",
    "combinationSku": "KMB-LG-08",
    "name": "ADØP TV ünitesi 209,1 cm",
    "note": "60 cm düz kapaklı base modül, 45 cm açık base modül, 180 cm adapte edilebilir tabla.",
    "collection": "airy",
    "intent": "Sık kullandıklarını görünür tut, diğer eşyalarını kapak arkasında sakla.",
    "tags": [
      "airy",
      "storage"
    ],
    "widths": [
      60,
      45
    ],
    "fronts": [
      "plain",
      "open"
    ],
    "span": 180,
    "spanEnabled": true,
    "spanOffset": 29.1,
    "upper": [],
    "bodyFinish": "dark-oak",
    "frontFinish": "dark-oak",
    "spanFinish": "dark-oak"
  },
  {
    "id": "uzun-diyalog",
    "combinationSku": "KMB-LG-09",
    "name": "ADØP TV ünitesi 239,1 cm",
    "note": "2 × 90 cm düşer kapaklı base modül, 180 cm adapte edilebilir tabla.",
    "collection": "storage",
    "intent": "İki geniş kutuyla depolamayı artırırken tablanın açık bölümünü koru.",
    "tags": [
      "storage",
      "airy"
    ],
    "widths": [
      90,
      90
    ],
    "fronts": [
      "drop",
      "drop"
    ],
    "span": 180,
    "spanEnabled": true,
    "spanOffset": 59.1,
    "upper": [],
    "bodyFinish": "oak",
    "frontFinish": "cream",
    "spanFinish": "oak"
  },
  {
    "id": "genis-nefes",
    "combinationSku": "KMB-LG-10",
    "name": "ADØP TV ünitesi 270 cm",
    "note": "2 × 90 cm düşer kapaklı base modül, 180 cm adapte edilebilir tabla.",
    "collection": "airy",
    "intent": "Renkli depolamayı açık meşe yüzey ve uzun bir açıklıkla dengele.",
    "tags": [
      "airy",
      "storage"
    ],
    "widths": [
      90,
      90
    ],
    "fronts": [
      "drop",
      "drop"
    ],
    "span": 180,
    "spanEnabled": true,
    "spanOffset": 90,
    "upper": [],
    "bodyFinish": "olive",
    "frontFinish": "olive",
    "spanFinish": "oak"
  },
  {
    "id": "yalin-uclu",
    "combinationSku": "KMB-LG-11",
    "name": "ADØP TV ünitesi 270 cm",
    "note": "3 × 90 cm düşer kapaklı base modül.",
    "collection": "storage",
    "intent": "Geniş bir duvarda üç kutuyla tek bir alçak depolama hattı oluştur.",
    "tags": [
      "storage"
    ],
    "widths": [
      90,
      90,
      90
    ],
    "fronts": [
      "drop",
      "drop",
      "drop"
    ],
    "span": 180,
    "spanEnabled": false,
    "spanOffset": 104.5,
    "upper": [],
    "bodyFinish": "dark-oak",
    "frontFinish": "dark-oak",
    "spanFinish": "dark-oak"
  },
  {
    "id": "yatay-ritim",
    "combinationSku": "KMB-LG-12",
    "name": "ADØP TV ünitesi 300 cm",
    "note": "2 × 60 cm düz kapaklı base modül, 45 cm açık base modül, 180 cm adapte edilebilir tabla.",
    "collection": "airy",
    "intent": "Üç farklı kullanım biçimini aynı renkte bir araya getir.",
    "tags": [
      "airy",
      "storage"
    ],
    "widths": [
      60,
      60,
      45
    ],
    "fronts": [
      "plain",
      "plain",
      "open"
    ],
    "span": 180,
    "spanEnabled": true,
    "spanOffset": 120,
    "upper": [],
    "bodyFinish": "cream",
    "frontFinish": "cream",
    "spanFinish": "oak"
  },
  {
    "id": "cep-duzeni",
    "combinationSku": "KMB-LG-13",
    "name": "ADØP TV ünitesi 45 cm",
    "note": "45 cm düz kapaklı base modül.",
    "collection": "compact",
    "intent": "En küçük modülle ihtiyacın kadar depolama oluştur.",
    "tags": [
      "compact"
    ],
    "widths": [
      45
    ],
    "fronts": [
      "plain"
    ],
    "span": 180,
    "spanEnabled": false,
    "spanOffset": 0,
    "upper": [],
    "bodyFinish": "cream",
    "frontFinish": "cream",
    "spanFinish": "oak"
  },
  {
    "id": "dar-duvar",
    "combinationSku": "KMB-LG-14",
    "name": "ADØP TV ünitesi 90 cm",
    "note": "45 cm düz kapaklı base modül, 45 cm açık base modül, 60 cm raf.",
    "collection": "compact",
    "intent": "Dar bir duvarda açık ve kapalı depolamayı bir rafla tamamla.",
    "tags": [
      "compact",
      "storage",
      "wall"
    ],
    "widths": [
      45,
      45
    ],
    "fronts": [
      "plain",
      "open"
    ],
    "span": 180,
    "spanEnabled": false,
    "spanOffset": 0,
    "upper": [
      {
        "type": "WS",
        "width": 60,
        "front": "open",
        "x": 30,
        "y": 128
      }
    ],
    "bodyFinish": "oak",
    "frontFinish": "cream",
    "spanFinish": "oak"
  },
  {
    "id": "kisa-mesafe",
    "combinationSku": "KMB-LG-15",
    "name": "ADØP TV ünitesi 120 cm",
    "note": "45 cm düz kapaklı base modül, 120 cm adapte edilebilir tabla.",
    "collection": "compact",
    "intent": "Kısa bir tabla ile küçük bir kutuya yüzey ve açık alan ekle.",
    "tags": [
      "compact",
      "airy"
    ],
    "widths": [
      45
    ],
    "fronts": [
      "plain"
    ],
    "span": 120,
    "spanEnabled": true,
    "spanOffset": 0,
    "upper": [],
    "bodyFinish": "cream",
    "frontFinish": "olive",
    "spanFinish": "oak"
  },
  {
    "id": "iki-kat-depolama",
    "combinationSku": "KMB-LG-16",
    "name": "ADØP TV ünitesi 120 cm",
    "note": "2 × 60 cm iki çekmeceli base modül, 60 cm düşer kapaklı duvar modül, 60 cm raf.",
    "collection": "storage",
    "intent": "Küçük eşyaları çekmecelere ayır, kapalı depolamayı duvar modülüyle artır.",
    "tags": [
      "storage",
      "wall"
    ],
    "widths": [
      60,
      60
    ],
    "fronts": [
      "drawers",
      "drawers"
    ],
    "span": 180,
    "spanEnabled": false,
    "spanOffset": 0,
    "upper": [
      {
        "type": "UW",
        "width": 60,
        "front": "drop",
        "x": 0,
        "y": 142
      },
      {
        "type": "WS",
        "width": 60,
        "front": "open",
        "x": 60,
        "y": 158.6
      }
    ],
    "bodyFinish": "dark-oak",
    "frontFinish": "cream",
    "spanFinish": "dark-oak"
  },
  {
    "id": "derin-hat",
    "combinationSku": "KMB-LG-17",
    "name": "ADØP TV ünitesi 180 cm",
    "note": "120 cm derin çekmeceli base modül, 60 cm düz kapaklı base modül, 120 cm raf.",
    "collection": "storage",
    "intent": "Geniş eşyalar için tek derin çekmeceyi günlük kapalı depolamayla birleştir.",
    "tags": [
      "storage",
      "wall"
    ],
    "widths": [
      120,
      60
    ],
    "fronts": [
      "deep-drawer",
      "plain"
    ],
    "span": 180,
    "spanEnabled": false,
    "spanOffset": 14.5,
    "upper": [
      {
        "type": "WS",
        "width": 120,
        "front": "open",
        "x": 30,
        "y": 140
      }
    ],
    "bodyFinish": "dark-oak",
    "frontFinish": "cream",
    "spanFinish": "dark-oak"
  },
  {
    "id": "gorunur-arsiv",
    "combinationSku": "KMB-LG-18",
    "name": "ADØP TV ünitesi 210 cm",
    "note": "120 cm hibrit base modül, 45 cm açık base modül, 45 cm açık duvar modül, 120 cm hibrit duvar modül.",
    "collection": "wall",
    "intent": "Kitaplar ve seçtiğin objeler için açık alanları artır; kapalı gözleri koru.",
    "tags": [
      "wall",
      "storage"
    ],
    "widths": [
      120,
      45
    ],
    "fronts": [
      "hybrid",
      "open"
    ],
    "span": 180,
    "spanEnabled": false,
    "spanOffset": 0,
    "upper": [
      {
        "type": "UW",
        "width": 45,
        "front": "open",
        "x": 0,
        "y": 138
      },
      {
        "type": "UW",
        "width": 120,
        "front": "hybrid",
        "x": 90,
        "y": 138
      }
    ],
    "bodyFinish": "oak",
    "frontFinish": "olive",
    "spanFinish": "oak"
  },
  {
    "id": "serbest-uc",
    "combinationSku": "KMB-LG-19",
    "name": "ADØP TV ünitesi 207,5 cm",
    "note": "90 cm düşer kapaklı base modül, 45 cm açık base modül, 120 cm adapte edilebilir tabla.",
    "collection": "airy",
    "intent": "Kapalı depolamanın sonunu açık bir göz ve boşlukla hafiflet.",
    "tags": [
      "airy",
      "storage"
    ],
    "widths": [
      90,
      45
    ],
    "fronts": [
      "drop",
      "open"
    ],
    "span": 120,
    "spanEnabled": true,
    "spanOffset": 87.5,
    "upper": [],
    "bodyFinish": "olive",
    "frontFinish": "olive",
    "spanFinish": "oak"
  },
  {
    "id": "ton-sur-ton",
    "combinationSku": "KMB-LG-20",
    "name": "ADØP TV ünitesi 230 cm",
    "note": "90 cm düşer kapaklı base modül, 90 cm iki çekmeceli base modül, 120 cm adapte edilebilir tabla.",
    "collection": "storage",
    "intent": "Kapak ve çekmeceyi aynı düzende birleştir, koyu tonlara ahşap bir yüzey ekle.",
    "tags": [
      "storage",
      "airy"
    ],
    "widths": [
      90,
      90
    ],
    "fronts": [
      "drop",
      "drawers"
    ],
    "span": 120,
    "spanEnabled": true,
    "spanOffset": 110,
    "upper": [],
    "bodyFinish": "olive",
    "frontFinish": "cream",
    "spanFinish": "dark-oak"
  },
  {
    "id": "duvarla-birlikte",
    "combinationSku": "KMB-LG-21",
    "name": "ADØP TV ünitesi 180 cm",
    "note": "3 × 60 cm düz kapaklı base modül, 45 cm açık duvar modül, 120 cm raf.",
    "collection": "wall",
    "intent": "Alt depolamanın yatay çizgisini açık duvar modülü ve rafla sürdür.",
    "tags": [
      "wall",
      "storage"
    ],
    "widths": [
      60,
      60,
      60
    ],
    "fronts": [
      "plain",
      "plain",
      "plain"
    ],
    "span": 180,
    "spanEnabled": false,
    "spanOffset": 14.5,
    "upper": [
      {
        "type": "UW",
        "width": 45,
        "front": "open",
        "x": 0,
        "y": 140
      },
      {
        "type": "WS",
        "width": 120,
        "front": "open",
        "x": 45,
        "y": 156.6
      }
    ],
    "bodyFinish": "oak",
    "frontFinish": "cream",
    "spanFinish": "oak"
  },
  {
    "id": "raf-araligi",
    "combinationSku": "KMB-LG-22",
    "name": "ADØP TV ünitesi 300 cm",
    "note": "2 × 90 cm derin çekmeceli base modül, 180 cm adapte edilebilir tabla, 120 cm raf, 120 cm hibrit duvar modül.",
    "collection": "wall",
    "intent": "Geniş depolamayı duvarda birbirinden ayrılan açık ve kapalı parçalarla tamamla.",
    "tags": [
      "wall",
      "storage",
      "airy"
    ],
    "widths": [
      90,
      90
    ],
    "fronts": [
      "deep-drawer",
      "deep-drawer"
    ],
    "span": 180,
    "spanEnabled": true,
    "spanOffset": 110,
    "upper": [
      {
        "type": "WS",
        "width": 120,
        "front": "open",
        "x": 0,
        "y": 142
      },
      {
        "type": "UW",
        "width": 120,
        "front": "hybrid",
        "x": 180,
        "y": 132
      }
    ],
    "bodyFinish": "dark-oak",
    "frontFinish": "cream",
    "spanFinish": "dark-oak"
  },
  {
    "id": "uzun-cizgi",
    "combinationSku": "KMB-LG-23",
    "name": "ADØP TV ünitesi 300 cm",
    "note": "2 × 120 cm düşer kapaklı base modül, 60 cm iki çekmeceli base modül, 120 cm raf.",
    "collection": "storage",
    "intent": "Geniş bir duvarda kapalı depolamayı çekmecelerle bölerek düzenle.",
    "tags": [
      "storage",
      "wall"
    ],
    "widths": [
      120,
      60,
      120
    ],
    "fronts": [
      "drop",
      "drawers",
      "drop"
    ],
    "span": 180,
    "spanEnabled": false,
    "spanOffset": 134.5,
    "upper": [
      {
        "type": "WS",
        "width": 120,
        "front": "open",
        "x": 90,
        "y": 140
      }
    ],
    "bodyFinish": "cream",
    "frontFinish": "cream",
    "spanFinish": "oak"
  },
  {
    "id": "asimetrik-duzen",
    "combinationSku": "KMB-LG-24",
    "name": "ADØP TV ünitesi 350 cm",
    "note": "120 cm hibrit base modül, 45 cm açık base modül, 60 cm düz kapaklı base modül, 180 cm adapte edilebilir tabla, 60 cm düşer kapaklı duvar modül, 90 cm raf.",
    "collection": "airy",
    "intent": "Farklı kutu ölçüleri ve ahşap ve lake yüzeylerle, duvarın iki ucuna farklı ağırlıklar ver.",
    "tags": [
      "airy",
      "storage",
      "wall"
    ],
    "widths": [
      120,
      45,
      60
    ],
    "fronts": [
      "hybrid",
      "open",
      "plain"
    ],
    "span": 180,
    "spanEnabled": true,
    "spanOffset": 170,
    "upper": [
      {
        "type": "UW",
        "width": 60,
        "front": "drop",
        "x": 0,
        "y": 142
      },
      {
        "type": "WS",
        "width": 90,
        "front": "open",
        "x": 60,
        "y": 158.6
      }
    ],
    "bodyFinish": "dark-oak",
    "frontFinish": "olive",
    "spanFinish": "dark-oak"
  }
].map(item=>{
 const config=C.clean({preset:'tv',span:item.span,spanEnabled:item.spanEnabled,spanOffset:item.spanOffset,bodyFinish:item.bodyFinish,frontFinish:item.frontFinish,spanFinish:item.spanFinish,modules:item.widths.map((width,i)=>({width,front:item.fronts[i]})),upper:item.upper||[]});
 const valid=config.spanEnabled?C.allowedOffsets(config):[];
 if(valid.length)config.spanOffset=valid.reduce((a,b)=>Math.abs(b-config.spanOffset)<Math.abs(a-config.spanOffset)?b:a);
 config.spanOffset=C.layout(config).spanOffset;
 // The hand-selected compositions use the same two edge lanes as the library.
 // Shelves occupy the opposite lane from boxes, with a shared top alignment.
 const boxes=config.upper.filter(u=>u.type==='UW'),shelves=config.upper.filter(u=>u.type==='WS'),ground=C.layout(config).groundWidth;
 if(boxes.length&&shelves.length){
   const boxLeft=boxes[0].x<=shelves[0].x,boxSide=boxLeft?'left':'right',shelfSide=boxLeft?'right':'left',origin=Math.min(...boxes.map(u=>u.x));
   const boxEnd=Math.max(...boxes.map(u=>u.x+u.width));
   for(const u of boxes){u.anchor=boxSide;u.edgeOffset=boxLeft?u.x-origin:boxEnd-u.x-u.width;}
   const top=Math.max(...boxes.map(u=>u.y+C.upperDimensions(u).height));
   for(const u of shelves){u.anchor=shelfSide;u.edgeOffset=0;u.y=top-2.8;}
 }else if(boxes.length){
   const ordered=boxes.slice().sort((a,b)=>a.x-b.x);
   if(ordered.length===2&&ordered[0].y===ordered[1].y){ordered[0].anchor='left';ordered[0].edgeOffset=0;ordered[1].anchor='right';ordered[1].edgeOffset=0;}
   else for(const u of boxes){u.anchor='left';u.edgeOffset=Math.max(0,u.x-Math.min(...boxes.map(v=>v.x)));}
 }else for(const u of shelves){u.anchor=Number(item.combinationSku.replace(/\D/g,''))%2?'left':'right';u.edgeOffset=0;}
 config.upper=C.resolveUpper(config.upper,Math.max(ground,C.upperBounds(config.upper).minWidth));
 const layout=C.layout(config),tags=new Set([item.collection,...(item.tags||[]),config.spanEnabled?'span':'no-span']);
 if(config.upper.length)tags.add('wall');
 if(config.upper.some(u=>u.type==='UW'))tags.add('upper-box');
 if(config.upper.some(u=>['vertical','vertical-glass'].includes(u.front)))tags.add('vertical');
 if(config.upper.some(u=>u.type==='WS'))tags.add('shelf');
 const name='ADØP TV ünitesi '+layout.width.toLocaleString('tr-TR',{maximumFractionDigits:1})+' cm';
 return{...item,name,tags:[...tags],finish:config.bodyFinish,bodyFinish:config.bodyFinish,frontFinish:config.frontFinish,spanFinish:config.spanFinish,config,layout};
});
global.AdopCombinationCollections=[{id:'compact',name:'Kompakt'},{id:'storage',name:'Depolama'},{id:'airy',name:'Açık alan'},{id:'wall',name:'Duvar modüllü'}];
global.AdopCombinations=items;
})(typeof window!=='undefined'?window:globalThis);
