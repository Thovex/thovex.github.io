// ─────────────────────────────────────────────────────────────
//  Sci-Fi Globe — Canvas 2D wireframe earth with coastlines
//  Draws connected coastline outlines, not scattered dots
// ─────────────────────────────────────────────────────────────

// Coastline polylines — each sub-array is a connected path [lat,lng, lat,lng, ...]
// Simplified but recognizable world coastlines
const COASTLINES = [
    // ── North America (West Coast: Alaska down to Mexico) ──
    [60,-141, 60,-147, 59,-153, 58,-152, 57,-155, 56,-158, 55,-161, 55,-164, 56,-166, 57,-170,
     55,-167, 53,-168, 52,-172, 51,-179, 52,177, 53,172, 55,166, 57,170],
    // Alaska Peninsula + Aleutians simplified
    [71,-156, 70,-152, 70,-146, 69,-141, 68,-136, 66,-138, 64,-141, 62,-146, 61,-150, 60,-147],
    // NW Coast
    [60,-141, 59,-139, 58,-136, 57,-135, 56,-133, 55,-131, 54,-133, 53,-132, 52,-131,
     51,-128, 50,-127, 49,-126, 48,-124, 47,-124, 46,-124, 45,-124, 44,-124,
     43,-124, 42,-124, 41,-124, 40,-124, 39,-124, 38,-123, 37,-122, 36,-122,
     35,-121, 34,-120, 33,-117, 32,-117, 31,-116, 30,-115, 29,-114, 28,-112,
     27,-110, 26,-109, 24,-110, 23,-110, 22,-106, 21,-105, 20,-105, 19,-104,
     18,-103, 17,-100, 16,-96, 15,-93, 14,-90, 15,-88, 16,-87, 17,-88, 18,-88,
     19,-88, 20,-87, 21,-87, 21,-90, 20,-91, 19,-91, 18,-92, 18,-94, 19,-96],
    // US East Coast + Gulf
    [19,-96, 20,-97, 22,-97, 24,-98, 26,-97, 27,-97, 28,-97, 29,-95, 30,-93,
     29,-90, 29,-89, 30,-88, 30,-86, 30,-84, 28,-83, 27,-82, 26,-82, 25,-81,
     25,-80, 26,-80, 27,-80, 28,-80, 30,-81, 31,-81, 32,-81, 33,-79, 34,-78,
     35,-76, 36,-76, 37,-76, 38,-75, 39,-75, 40,-74, 41,-72, 42,-71, 42,-70,
     43,-70, 44,-69, 44,-67, 45,-67, 46,-67, 47,-65, 47,-63, 46,-61, 45,-62],
    // Canadian Maritimes + Newfoundland
    [45,-62, 46,-60, 47,-59, 47,-56, 48,-53, 49,-55, 50,-57, 51,-56, 52,-56, 53,-56],
    // Hudson Bay area + Arctic Canada
    [53,-56, 55,-60, 58,-62, 59,-64, 60,-65, 62,-66, 63,-68, 65,-62, 66,-62,
     68,-65, 69,-68, 70,-72, 72,-78, 74,-80, 76,-82, 76,-90, 74,-95, 72,-95,
     71,-96, 70,-100, 68,-105, 66,-110, 65,-120, 68,-133, 69,-138, 70,-141, 71,-141],
    // Greenland
    [60,-43, 62,-42, 64,-40, 66,-37, 68,-33, 70,-27, 72,-24, 74,-20, 76,-19, 78,-20,
     80,-18, 82,-20, 83,-28, 83,-38, 82,-44, 80,-52, 78,-58, 76,-64, 74,-58, 72,-55,
     70,-52, 68,-50, 66,-46, 64,-44, 62,-44, 60,-43],
    // Central America
    [18,-88, 17,-88, 16,-87, 15,-84, 14,-83, 13,-84, 12,-84, 11,-84, 10,-83,
     9,-84, 9,-79, 8,-77, 7,-77, 8,-76],
    // ── South America ──
    [8,-76, 10,-72, 11,-72, 12,-72, 12,-70, 11,-68, 10,-67, 10,-65, 8,-63, 8,-60,
     7,-58, 6,-57, 5,-54, 4,-52, 3,-51, 2,-50, 1,-50, 0,-50, -1,-48, -2,-44,
     -3,-41, -5,-36, -6,-35, -8,-35, -8,-34, -10,-36, -12,-38, -14,-39, -16,-39,
     -18,-40, -20,-40, -22,-41, -23,-42, -23,-44, -24,-46, -25,-48, -27,-49,
     -29,-49, -30,-51, -32,-52, -33,-53, -35,-57, -37,-57, -38,-58, -39,-62,
     -41,-64, -43,-65, -45,-66, -47,-66, -49,-68, -51,-69, -52,-70, -54,-69, -55,-67],
    // South America West Coast
    [8,-76, 6,-77, 4,-78, 2,-80, 0,-80, -2,-81, -4,-81, -5,-81, -6,-80, -7,-80,
     -8,-79, -10,-76, -12,-77, -14,-76, -16,-75, -18,-71, -20,-70, -22,-70,
     -24,-70, -26,-71, -28,-71, -30,-72, -32,-72, -34,-72, -36,-73, -38,-74,
     -40,-74, -42,-74, -44,-73, -46,-74, -48,-76, -50,-75, -52,-72, -54,-70, -55,-67],
    // ── Europe ──
    [36,-6, 37,-7, 38,-9, 40,-9, 41,-9, 42,-9, 43,-8, 43,-2, 43,3, 44,4,
     43,5, 43,7, 44,8, 45,7, 46,6, 47,6, 48,5, 49,3, 50,1, 51,2, 52,4,
     53,5, 53,7, 54,8, 55,8, 54,10, 55,10, 56,8, 56,10, 57,10, 58,11,
     59,11, 60,5, 61,5, 62,5, 63,6, 64,11, 65,12, 66,13, 67,15, 68,16,
     69,16, 70,19, 70,24, 71,26, 70,28],
    // Scandinavia + Finland + Russia
    [70,28, 69,30, 68,28, 67,26, 66,24, 65,25, 64,26, 63,22, 62,21,
     61,22, 60,22, 60,24, 60,28, 61,30, 62,30, 64,30, 65,28, 66,28,
     68,30, 69,33, 70,32, 69,36, 68,38, 68,42, 67,42, 66,40],
    // Baltic
    [54,10, 54,13, 54,14, 54,18, 55,21, 56,21, 57,22, 58,24, 60,24],
    // Mediterranean
    [36,-6, 36,-5, 36,-2, 37,0, 38,0, 39,0, 40,0, 41,1, 42,3, 43,3],
    // Italy
    [44,8, 44,9, 44,12, 43,12, 42,12, 41,14, 41,16, 40,16, 40,18,
     39,17, 38,16, 37,15, 36,15],
    [38,16, 38,17, 39,18, 40,18],
    // Greece + Turkey
    [40,20, 39,20, 38,22, 38,24, 37,24, 36,23, 36,28, 37,27],
    [42,28, 41,28, 41,29, 42,33, 42,36, 41,36, 37,36, 36,36, 37,35],
    [42,28, 43,28, 44,34, 44,38, 43,40, 42,42, 41,42, 40,44],
    // ── Africa ──
    [36,10, 37,10, 37,8, 36,2, 36,0, 35,-1, 35,-6],
    [35,-6, 34,-6, 33,-8, 32,-9, 31,-10, 28,-13, 26,-15, 24,-16, 22,-17,
     20,-17, 18,-16, 16,-17, 14,-17, 13,-16, 12,-16, 10,-15, 8,-13,
     6,-10, 5,-7, 5,-5, 5,-4, 5,-3, 4,2, 4,5, 4,7, 5,7, 6,5, 6,2, 7,1, 6,-2, 5,-5],
    [5,7, 6,8, 6,10, 5,10, 4,10, 4,9, 3,10, 2,10, 1,10, 0,10],
    [0,10, 0,9, -1,9, -3,10, -4,12, -6,12, -8,13, -10,14, -12,14,
     -14,12, -16,12, -17,12, -18,14, -18,16, -17,18, -16,22, -18,24,
     -20,28, -22,30, -24,32, -26,33, -28,32, -30,31, -31,30, -32,29,
     -33,28, -34,26, -34,22, -34,18, -33,18, -32,18],
    // East Africa
    [36,10, 34,32, 32,32, 30,32, 28,34, 26,35, 24,36, 22,37, 20,38,
     18,40, 16,42, 14,44, 12,46, 10,48, 8,48, 6,46, 4,44, 2,42,
     0,42, -2,40, -4,40, -6,38, -8,36, -10,34, -12,34, -14,34, -16,36,
     -18,36, -20,34, -22,35, -24,36, -26,34, -28,33, -30,32, -32,29],
    [12,46, 12,44, 11,44, 10,44, 10,45, 10,48, 12,50, 14,48, 12,46],
    [-12,49, -14,48, -16,46, -18,44, -20,44, -22,44, -24,44, -26,47, -24,48, -22,48,
     -20,49, -18,50, -16,50, -14,50, -12,49],
    // ── Asia ──
    [32,32, 32,34, 32,36, 34,36, 36,36, 36,40, 38,44, 40,44, 40,50,
     38,48, 36,50, 34,52, 32,52, 30,50, 28,50, 26,50, 24,52, 24,55,
     23,58, 22,59, 20,58, 18,54, 16,52, 14,48, 12,44],
    [30,48, 29,48, 28,50, 26,50, 24,52, 24,54, 26,56, 27,56, 28,56, 30,50, 30,48],
    // India
    [24,68, 22,70, 20,73, 18,73, 16,74, 14,75, 12,76, 10,76, 8,77, 8,78,
     10,80, 12,80, 14,80, 16,80, 18,84, 20,87, 22,88, 22,90, 24,90, 26,90,
     28,88, 28,84, 26,82, 24,80, 24,76, 24,72, 24,68],
    [10,80, 8,80, 7,80, 6,81, 7,82, 8,82, 10,80],
    // SE Asia
    [22,90, 20,92, 18,94, 16,96, 14,98, 12,100, 10,99, 8,100, 6,100,
     4,104, 2,104, 1,104, 1,103, 2,102, 4,100, 6,100],
    // China coast
    [40,124, 39,122, 38,120, 36,120, 34,120, 32,122, 30,122, 28,120,
     26,120, 24,118, 22,114, 21,110, 20,110, 18,108, 16,108,
     14,108, 12,108, 10,106, 8,106, 6,108, 4,104],
    [40,124, 42,130, 44,132, 46,134, 48,135, 50,140, 52,141, 54,138,
     56,138, 58,140, 60,143, 62,150, 64,160, 66,170, 68,180, 67,-170, 65,-168],
    // Korea
    [38,126, 36,126, 34,126, 34,128, 36,130, 38,128, 38,126],
    // Japan
    [34,130, 34,132, 33,134, 34,136, 35,136, 36,140, 38,140, 40,140, 42,142, 44,144, 45,142, 43,141],
    [34,130, 32,130, 31,131, 32,132, 33,134],
    // Indonesia
    [6,116, 4,118, 2,118, 0,118, -2,116, -4,114, -6,112, -8,110, -8,114,
     -8,116, -7,118, -6,120, -8,122, -8,126, -6,128, -4,128, -2,128,
     0,128, 2,126, 4,124, 6,122, 6,118, 6,116],
    [7,117, 6,116, 4,114, 2,110, 0,110, -2,110, -3,112, -2,116, 0,118, 2,118, 4,118, 6,118, 7,117],
    [5,98, 4,100, 2,100, 0,100, -2,102, -4,104, -6,106, -6,104, -4,102, -2,100, 0,98, 2,98, 5,98],
    // ── Russia / Siberia ──
    [70,28, 70,32, 70,40, 72,50, 72,55, 74,60, 72,65, 72,80, 74,90, 76,100,
     76,110, 74,113, 72,120, 74,130, 72,140, 68,162, 66,170, 68,180],
    // ── Australia ──
    [-12,130, -12,136, -14,136, -15,132, -14,130, -12,130],
    [-14,136, -16,136, -18,138, -20,140, -20,142, -18,140, -16,136],
    [-12,136, -12,138, -14,142, -16,146, -18,146, -20,148, -22,150,
     -24,152, -26,153, -28,153, -30,153, -32,152, -34,151, -36,150,
     -38,148, -38,146, -38,144, -38,142, -36,137, -34,136, -32,134,
     -32,132, -30,132, -28,128, -26,126, -24,114, -22,114, -20,118,
     -18,122, -16,124, -14,126, -12,130],
    // New Zealand
    [-35,174, -36,175, -38,176, -39,178, -41,176, -41,174, -39,174, -38,176],
    [-41,174, -42,172, -44,170, -46,168, -47,167, -46,170, -44,172, -42,174, -41,174],
    // ── UK + Ireland ──
    [50,-5, 51,-3, 52,-1, 53,0, 53,1, 52,2, 51,1, 50,0, 50,-2, 50,-5],
    [52,-1, 53,0, 54,-1, 55,-2, 56,-3, 57,-5, 58,-5, 58,-3, 57,-2, 56,0, 55,0, 54,0, 53,1],
    [52,-10, 53,-10, 54,-8, 54,-6, 53,-6, 52,-7, 51,-9, 52,-10],
    // Iceland
    [64,-22, 65,-18, 66,-16, 66,-14, 65,-14, 64,-16, 63,-18, 63,-20, 64,-22],
];

// Major city locations for traffic pings [lat, lng, name]
const CITIES = [
    [40.7, -74.0, 'New York'], [51.5, -0.1, 'London'], [35.7, 139.7, 'Tokyo'],
    [48.9, 2.35, 'Paris'], [-33.9, 151.2, 'Sydney'], [55.8, 37.6, 'Moscow'],
    [37.8, -122.4, 'San Francisco'], [52.5, 13.4, 'Berlin'], [1.35, 103.8, 'Singapore'],
    [-23.5, -46.6, 'São Paulo'], [19.4, -99.1, 'Mexico City'], [28.6, 77.2, 'Delhi'],
    [39.9, 116.4, 'Beijing'], [59.3, 18.1, 'Stockholm'], [30.0, 31.2, 'Cairo'],
    [-1.3, 36.8, 'Nairobi'], [41.0, 29.0, 'Istanbul'], [35.2, -80.8, 'Charlotte'],
    [45.5, -73.6, 'Montreal'], [52.4, 4.9, 'Amsterdam'],
];

export function initGlobe(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, cx, cy, radius;
    let rotation = 0;
    let pings = [];
    let animId;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        width = rect.width;
        height = rect.height;
        if (width === 0 || height === 0) return;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx = width / 2;
        cy = height / 2;
        radius = Math.min(width, height) * 0.42;
    }

    function latLngTo3D(lat, lng) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lng + rotation) * Math.PI / 180;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        return { x: cx + x, y: cy - y, z };
    }

    function addPing() {
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        pings.push({
            lat: city[0], lng: city[1], name: city[2],
            life: 1.0, maxRadius: 12 + Math.random() * 8
        });
    }

    function drawGlobe() {
        if (width === 0 || height === 0) return;
        ctx.clearRect(0, 0, width, height);

        // Outer glow ring
        const grad = ctx.createRadialGradient(cx, cy, radius * 0.95, cx, cy, radius * 1.15);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.06)');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // Globe background
        const bgGrad = ctx.createRadialGradient(cx - radius * 0.15, cy - radius * 0.15, 0, cx, cy, radius);
        bgGrad.addColorStop(0, 'rgba(0, 240, 255, 0.025)');
        bgGrad.addColorStop(0.7, 'rgba(0, 20, 30, 0.06)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Grid lines — latitude
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.lineWidth = 0.5;
        for (let lat = -60; lat <= 60; lat += 30) {
            ctx.beginPath();
            let moved = false;
            for (let lng = 0; lng <= 360; lng += 3) {
                const p = latLngTo3D(lat, lng);
                if (p.z > 0) {
                    if (!moved) { ctx.moveTo(p.x, p.y); moved = true; }
                    else ctx.lineTo(p.x, p.y);
                } else { moved = false; }
            }
            ctx.stroke();
        }

        // Grid lines — longitude
        for (let lng = 0; lng < 360; lng += 30) {
            ctx.beginPath();
            let moved = false;
            for (let lat = -90; lat <= 90; lat += 3) {
                const p = latLngTo3D(lat, lng);
                if (p.z > 0) {
                    if (!moved) { ctx.moveTo(p.x, p.y); moved = true; }
                    else ctx.lineTo(p.x, p.y);
                } else { moved = false; }
            }
            ctx.stroke();
        }

        // ── Coastline outlines ──
        COASTLINES.forEach(line => {
            ctx.beginPath();
            let moved = false;
            let prevZ = 0;
            for (let i = 0; i < line.length; i += 2) {
                const lat = line[i];
                const lng = line[i + 1];
                const p = latLngTo3D(lat, lng);
                if (p.z > 0) {
                    const depth = p.z / radius;
                    const alpha = 0.15 + depth * 0.55;
                    if (!moved || prevZ <= 0) {
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
                        ctx.lineWidth = 0.6 + depth * 0.8;
                        ctx.moveTo(p.x, p.y);
                        moved = true;
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                } else {
                    if (moved) { ctx.stroke(); ctx.beginPath(); moved = false; }
                }
                prevZ = p.z;
            }
            ctx.stroke();
        });

        // City dots
        CITIES.forEach(([lat, lng]) => {
            const p = latLngTo3D(lat, lng);
            if (p.z > 0) {
                const depth = p.z / radius;
                const alpha = 0.1 + depth * 0.3;
                ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Traffic pings
        pings = pings.filter(p => p.life > 0);
        pings.forEach(ping => {
            const p = latLngTo3D(ping.lat, ping.lng);
            if (p.z > 0) {
                const progress = 1 - ping.life;
                const r = ping.maxRadius * progress;
                const alpha = ping.life * 0.8;

                ctx.strokeStyle = `rgba(255, 58, 58, ${alpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.stroke();

                if (progress > 0.2) {
                    const r2 = ping.maxRadius * (progress - 0.2);
                    ctx.strokeStyle = `rgba(255, 58, 58, ${alpha * 0.4})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r2, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.fillStyle = `rgba(255, 58, 58, ${Math.min(1, ping.life * 2)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();

                const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
                glow.addColorStop(0, `rgba(255, 58, 58, ${alpha * 0.15})`);
                glow.addColorStop(1, 'rgba(255, 58, 58, 0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ping.life -= 0.008;
        });

        // Globe edge
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Atmospheric glow on edge
        const edgeGlow = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius * 1.02);
        edgeGlow.addColorStop(0, 'rgba(0, 240, 255, 0)');
        edgeGlow.addColorStop(0.7, 'rgba(0, 240, 255, 0.02)');
        edgeGlow.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = edgeGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.02, 0, Math.PI * 2);
        ctx.fill();

        // Scanline effect
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        for (let y = 0; y < height; y += 4) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
            ctx.fillRect(cx - radius, y, radius * 2, 1);
        }
        ctx.restore();
    }

    function animate() {
        rotation += 0.12;
        if (Math.random() < 0.025) addPing();
        drawGlobe();
        animId = requestAnimationFrame(animate);
    }

    function triggerPing(lat, lng) {
        pings.push({ lat, lng, name: '', life: 1.0, maxRadius: 16 + Math.random() * 8 });
    }

    function burstPings(count = 8) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const city = CITIES[Math.floor(Math.random() * CITIES.length)];
                triggerPing(city[0], city[1]);
            }, i * 150);
        }
    }

    resize();
    window.addEventListener('resize', resize);
    animate();
    setTimeout(() => burstPings(5), 500);

    return { triggerPing, burstPings, destroy: () => cancelAnimationFrame(animId) };
}
