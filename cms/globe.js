// ─────────────────────────────────────────────────────────────
//  Sci-Fi Globe — Canvas 2D wireframe earth with traffic pings
// ─────────────────────────────────────────────────────────────

// Simplified land mass coordinates [lat, lng] — ~600 points covering major continents
const LAND_POINTS = [
    // North America
    [71,-156],[70,-141],[68,-135],[65,-168],[64,-165],[63,-162],[62,-164],[60,-165],[59,-163],[57,-170],
    [56,-169],[55,-167],[54,-166],[53,-168],[52,-170],[65,-141],[64,-139],[62,-141],[60,-149],[59,-151],
    [58,-152],[57,-154],[56,-159],[55,-162],[60,-140],[58,-136],[56,-133],[55,-131],[54,-130],[52,-131],
    [50,-128],[49,-126],[48,-124],[47,-124],[46,-124],[45,-124],[44,-124],[43,-124],[42,-124],[68,-133],
    [67,-136],[66,-137],[64,-128],[63,-130],[62,-131],[61,-139],[60,-134],[58,-134],[55,-127],[53,-127],
    [51,-128],[49,-125],[47,-122],[46,-123],[44,-124],[42,-124],[40,-124],[38,-123],[36,-122],[35,-121],
    [34,-120],[33,-118],[32,-117],[31,-116],[30,-115],[29,-114],[28,-115],[27,-115],[26,-113],[25,-112],
    [24,-110],[23,-110],[22,-110],[21,-106],[20,-105],[19,-105],[18,-103],[17,-101],[16,-98],[15,-96],
    [40,-74],[41,-72],[42,-71],[43,-70],[44,-69],[45,-67],[46,-67],[47,-67],[48,-64],[49,-64],[50,-60],
    [51,-57],[52,-56],[53,-56],[55,-60],[57,-62],[58,-63],[59,-64],[60,-65],[62,-68],[63,-69],[64,-72],
    [65,-75],[67,-76],[69,-79],[70,-85],[71,-95],[72,-95],[73,-95],[74,-95],[75,-95],[72,-80],
    [41,-73],[40,-74],[39,-75],[38,-76],[37,-76],[36,-76],[35,-76],[34,-77],[33,-79],[32,-81],
    [31,-82],[30,-84],[29,-89],[28,-91],[27,-97],[26,-97],[25,-97],[24,-98],[30,-88],[29,-90],[28,-96],
    // South America
    [12,-72],[11,-74],[10,-76],[9,-78],[8,-77],[7,-77],[6,-76],[5,-76],[4,-77],[3,-78],[2,-79],
    [1,-80],[0,-80],[-1,-80],[-2,-80],[-3,-79],[-4,-78],[-5,-76],[-6,-76],[-7,-76],[-8,-75],
    [-9,-76],[-10,-76],[-11,-77],[-12,-77],[-13,-76],[-14,-76],[-15,-75],[-16,-69],[-17,-68],
    [-18,-63],[-19,-58],[-20,-57],[-21,-55],[-22,-53],[-23,-47],[-24,-46],[-25,-48],[-26,-49],
    [-27,-49],[-28,-49],[-29,-50],[-30,-51],[-31,-52],[-32,-52],[-33,-53],[-35,-57],[-36,-57],
    [-37,-57],[-38,-58],[-40,-62],[-42,-64],[-44,-66],[-46,-68],[-48,-70],[-50,-74],[-52,-70],[-54,-68],
    [-3,-60],[-4,-55],[-5,-49],[-6,-45],[-7,-40],[-8,-35],[-6,-35],[-4,-38],[-3,-42],[-2,-44],
    [-1,-48],[0,-50],[2,-52],[4,-54],[6,-58],[8,-62],[10,-67],[11,-72],
    // Europe
    [36,-6],[37,-7],[38,-9],[39,-9],[40,-9],[41,-9],[42,-9],[43,-8],[44,-5],[45,-2],[46,0],
    [47,2],[48,3],[49,3],[50,2],[51,2],[52,4],[53,5],[54,8],[55,8],[56,8],[57,10],[58,11],
    [59,11],[60,10],[61,10],[62,12],[63,14],[64,14],[65,14],[66,14],[67,15],[68,16],[69,18],[70,20],
    [70,25],[69,28],[68,28],[67,27],[66,26],[65,25],[64,26],[63,28],[62,30],[61,30],[60,28],
    [59,24],[58,22],[57,20],[56,18],[55,14],[54,14],[53,14],[52,10],[51,7],[50,6],
    [48,8],[47,7],[46,7],[45,7],[44,8],[43,10],[42,12],[41,12],[40,14],[39,16],[38,16],[37,15],
    [36,14],[35,14],[36,23],[37,24],[38,24],[39,26],[40,26],[41,28],[42,28],[43,28],[44,28],
    [45,30],[46,30],[47,32],[48,34],[49,36],[50,38],[51,40],[52,40],[54,40],
    // Africa
    [35,-6],[34,-2],[33,0],[32,2],[31,2],[30,10],[29,11],[28,11],[27,10],[26,8],[25,8],
    [24,10],[23,10],[22,12],[21,14],[20,16],[18,16],[16,16],[14,17],[12,15],[10,14],[8,10],
    [6,8],[5,6],[4,7],[3,10],[2,10],[1,10],[0,10],[-1,12],[-2,14],[-3,16],[-4,18],[-5,20],
    [-6,22],[-8,24],[-10,26],[-12,28],[-14,30],[-16,32],[-18,34],[-20,35],[-22,35],[-24,35],
    [-26,33],[-28,32],[-30,30],[-32,28],[-34,26],[-34,20],[-33,18],[-30,18],[-28,16],
    [4,42],[6,44],[8,46],[10,48],[12,50],[14,48],[12,44],[10,42],[8,40],[6,40],
    [32,32],[30,32],[28,34],[26,36],[24,36],[22,38],[20,40],[18,42],[16,42],[14,42],
    [-2,40],[-4,38],[-6,38],[-8,36],[-10,35],[-12,34],[-15,35],[-18,36],[-20,35],
    // Asia
    [42,44],[44,44],[46,48],[48,52],[50,54],[52,58],[54,60],[56,60],[58,56],[60,56],
    [62,58],[64,60],[66,60],[68,60],[70,60],[72,60],[72,70],[72,80],[70,72],[68,70],
    [66,68],[64,68],[62,70],[60,72],[58,68],[56,68],[54,72],[52,76],[50,78],[48,80],
    [46,80],[44,80],[42,78],[40,76],[38,74],[36,72],[34,70],[32,68],[30,66],[28,68],
    [26,70],[24,72],[22,72],[20,72],[18,74],[16,76],[14,78],[12,80],[10,78],[8,80],
    [6,80],[4,80],[2,80],[1,104],[2,106],[4,108],[6,108],[8,106],[10,106],[12,108],
    [14,108],[16,108],[18,106],[20,106],[22,108],[24,110],[26,112],[28,114],[30,116],
    [32,118],[34,118],[36,120],[38,120],[40,118],[42,118],[44,120],[46,118],[48,116],
    [50,114],[52,112],[54,110],[56,108],[58,106],[60,104],[62,110],[64,120],[66,130],
    [68,140],[66,150],[64,160],[62,160],[60,160],[58,158],[56,155],[54,155],[52,158],
    [50,156],[48,152],[46,148],[44,145],[42,144],[40,140],[38,138],[36,136],[34,132],
    [32,130],[30,120],[28,118],[26,116],[24,114],[22,114],[20,110],[18,108],[16,108],
    [35,136],[34,134],[33,132],[32,131],[36,140],[38,140],[40,140],[42,142],[44,144],
    // Australia
    [-12,130],[-14,132],[-16,134],[-18,138],[-20,140],[-22,144],[-24,148],[-26,150],
    [-28,152],[-30,152],[-32,152],[-34,150],[-36,148],[-38,146],[-38,142],[-36,138],
    [-34,136],[-32,134],[-30,132],[-28,130],[-26,128],[-24,126],[-22,124],[-20,122],
    [-18,122],[-16,124],[-14,126],[-12,130],[-20,116],[-22,114],[-24,114],[-26,114],
    [-28,114],[-30,116],[-32,116],[-34,118],[-34,120],[-32,122],[-30,124],[-28,128],
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
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx = width / 2;
        cy = height / 2;
        radius = Math.min(width, height) * 0.38;
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
        const bgGrad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, 0, cx, cy, radius);
        bgGrad.addColorStop(0, 'rgba(0, 240, 255, 0.03)');
        bgGrad.addColorStop(0.7, 'rgba(0, 20, 30, 0.08)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Grid lines — latitude
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
        ctx.lineWidth = 0.5;
        for (let lat = -60; lat <= 60; lat += 30) {
            ctx.beginPath();
            for (let lng = 0; lng <= 360; lng += 3) {
                const p = latLngTo3D(lat, lng);
                if (p.z > 0) {
                    if (lng === 0 || latLngTo3D(lat, lng - 3).z <= 0) {
                        ctx.moveTo(p.x, p.y);
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                }
            }
            ctx.stroke();
        }

        // Grid lines — longitude
        for (let lng = 0; lng < 360; lng += 30) {
            ctx.beginPath();
            for (let lat = -90; lat <= 90; lat += 3) {
                const p = latLngTo3D(lat, lng);
                if (p.z > 0) {
                    if (lat === -90 || latLngTo3D(lat - 3, lng).z <= 0) {
                        ctx.moveTo(p.x, p.y);
                    } else {
                        ctx.lineTo(p.x, p.y);
                    }
                }
            }
            ctx.stroke();
        }

        // Equator highlight
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let lng = 0; lng <= 360; lng += 2) {
            const p = latLngTo3D(0, lng);
            if (p.z > 0) {
                if (lng === 0 || latLngTo3D(0, lng - 2).z <= 0) {
                    ctx.moveTo(p.x, p.y);
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            }
        }
        ctx.stroke();

        // Land mass dots
        LAND_POINTS.forEach(([lat, lng]) => {
            const p = latLngTo3D(lat, lng);
            if (p.z > 0) {
                const depth = p.z / radius;
                const alpha = 0.2 + depth * 0.6;
                const size = 1 + depth * 1.2;
                ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
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

                // Expanding ring
                ctx.strokeStyle = `rgba(255, 58, 58, ${alpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.stroke();

                // Second ring
                if (progress > 0.2) {
                    const r2 = ping.maxRadius * (progress - 0.2);
                    ctx.strokeStyle = `rgba(255, 58, 58, ${alpha * 0.4})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r2, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Center dot
                ctx.fillStyle = `rgba(255, 58, 58, ${Math.min(1, ping.life * 2)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();

                // Glow
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
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Scanline effect over globe
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        for (let y = 0; y < height; y += 4) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
            ctx.fillRect(cx - radius, y, radius * 2, 1);
        }
        ctx.restore();
    }

    function animate() {
        rotation += 0.15;
        if (Math.random() < 0.03) addPing();
        drawGlobe();
        animId = requestAnimationFrame(animate);
    }

    // Trigger a ping manually (called when stats load)
    function triggerPing(lat, lng) {
        pings.push({
            lat, lng, name: '',
            life: 1.0, maxRadius: 16 + Math.random() * 8
        });
    }

    // Fire a burst of pings for visual effect
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

    // Initial burst
    setTimeout(() => burstPings(5), 500);

    return { triggerPing, burstPings, destroy: () => cancelAnimationFrame(animId) };
}

