document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('floorMapCanvas');
    const ctx = canvas.getContext('2d');
    const mapWrapper = document.querySelector('.map-wrapper');
    const infoPanel = document.getElementById('info-panel');
    const tenantName = document.getElementById('tenant-name');
    const tenantDescription = document.getElementById('tenant-description');
    const closeInfoButton = document.getElementById('close-info');
    const resetViewButton = document.getElementById('reset-view');
    const tenantListElement = document.getElementById('tenantList');

    // Define the original map dimensions (from your image aspect ratio)
    const ORIGINAL_MAP_WIDTH = 900;
    const ORIGINAL_MAP_HEIGHT = 600;

    // Set canvas dimensions to match the wrapper's CSS dimensions
    canvas.width = mapWrapper.clientWidth;
    canvas.height = mapWrapper.clientHeight;

    // Map state variables
    let currentScale = 1;
    let targetScale = 1; // For animation
    let currentTranslateX = 0;
    let currentTranslateY = 0;
    let targetTranslateX = 0; // For animation
    let targetTranslateY = 0; // For animation

    // Panning state
    let isDragging = false;
    let lastX, lastY;
    let animationFrameId = null;

    // "You Are Here" position in map coordinates
    const YOU_ARE_HERE_MAP_X = 810; // Approx. 90% of ORIGINAL_MAP_WIDTH
    const YOU_ARE_HERE_MAP_Y = 50;  // Approx. 8% of ORIGINAL_MAP_HEIGHT

    // Tenant data (positions are relative to ORIGINAL_MAP_WIDTH/HEIGHT)
    // Make sure these tenant areas do NOT overlap with pathNodes or the YOU_ARE_HERE_MAP_X/Y if you want precise pathing
    const tenants = [
        // Top Row
        { id: 'restrooms', name: "Restrooms", info: "Public restrooms available.", x: 0, y: 0, width: 0.12, height: 0.12, color: '#1e90ff', pathNode: 'restroom_entry' },
        { id: 'health-beauty', name: "Health and Beauty", info: "Your one-stop shop for cosmetics and wellness.", x: 0.125, y: 0, width: 0.15, height: 0.12, color: '#1e90ff' },
        { id: 'snack-bar', name: "Snack Bar", info: "Quick bites and refreshing drinks.", x: 0.28, y: 0, width: 0.20, height: 0.08, color: '#1e90ff' },
        { id: 'customer-service', name: "Customer Service", info: "Information and assistance.", x: 0.33, y: 0.09, width: 0.15, height: 0.08, color: '#1e90ff' },

        // Left Column
        { id: 'appliances', name: "Appliances", info: "Find the latest home appliances.", x: 0, y: 0.13, width: 0.10, height: 0.20, color: '#1e90ff' },
        { id: 'stationary', name: "Stationary", info: "All your writing and office supplies.", x: 0, y: 0.34, width: 0.10, height: 0.20, color: '#1e90ff' },
        { id: 'home-decor', name: "Home Decor", info: "Transform your living space.", x: 0, y: 0.55, width: 0.10, height: 0.25, color: '#1e90ff' },

        // Middle Sections
        { id: 'women-clothing', name: "Women's Clothing / Accessories", info: "Fashion for her.", x: 0.20, y: 0.20, width: 0.15, height: 0.25, color: '#1e90ff' },
        { id: 'boys-clothing', name: "Boy's Clothing", info: "Trendy wear for boys.", x: 0.36, y: 0.20, width: 0.15, height: 0.12, color: '#1e90ff' },
        { id: 'girls-clothing', name: "Girl's Clothing", x: 0.52, y: 0.20, width: 0.15, height: 0.12, color: '#1e90ff' },
        { id: 'mens-clothing', name: "Men's Clothing", info: "Stylish apparel for him.", x: 0.36, y: 0.33, width: 0.15, height: 0.12, color: '#1e90ff' },
        { id: 'hosiery', name: "Hosiery", info: "Socks, stockings, and more.", x: 0.52, y: 0.33, width: 0.15, height: 0.12, color: '#1e90ff' },

        // Bottom Row
        { id: 'toys', name: "Toys", info: "Fun for all ages!", x: 0.11, y: 0.81, width: 0.15, height: 0.15, color: '#1e90ff', pathNode: 'toys_entry' },
        { id: 'home-electronics', name: "Home Electronics", info: "Gadgets and entertainment systems.", x: 0.27, y: 0.81, width: 0.30, height: 0.15, color: '#1e90ff' },
        { id: 'sporting-goods', name: "Sporting Goods", info: "Gear for your active lifestyle.", x: 0.58, y: 0.81, width: 0.30, height: 0.15, color: '#1e90ff' },

        // Right Column
        { id: 'seasonal', name: "Seasonal", info: "Special items for holidays and seasons.", x: 0.90, y: 0, width: 0.10, height: 0.25, color: '#1e90ff' },
        { id: 'automotive', name: "Automotive", info: "Car accessories and parts.", x: 0.90, y: 0.26, width: 0.10, height: 0.30, color: '#1e90ff', pathNode: 'automotive_entry' },
    ];

    // --- Pathfinding Nodes and Paths ---
    // Define nodes as { id: 'node_id', x: pixelX, y: pixelY }
    const pathNodes = {
        'you_are_here_start': { x: YOU_ARE_HERE_MAP_X, y: YOU_ARE_HERE_MAP_Y },
        'main_corridor_top_right': { x: 750, y: 150 },
        'main_corridor_middle_right': { x: 750, y: 400 },
        'main_corridor_bottom_right': { x: 750, y: 550 },
        'main_corridor_center_v': { x: 450, y: 350 },
        'main_corridor_center_h': { x: 450, y: 150 },
        'main_corridor_middle_left': { x: 150, y: 350 },
        'main_corridor_bottom_left': { x: 150, y: 550 },
        'restroom_entry': { x: 100, y: 50 }, // Near Restrooms
        'toys_entry': { x: 200, y: 550 }, // Near Toys
        'automotive_entry': { x: 850, y: 400 }, // Near Automotive
    };

    // Define paths as connections between nodes. Simplistic for demo.
    // In a real app, this would be an adjacency list for a graph.
    const paths = [
        ['you_are_here_start', 'main_corridor_top_right'],
        ['main_corridor_top_right', 'main_corridor_middle_right'],
        ['main_corridor_middle_right', 'main_corridor_bottom_right'],
        ['main_corridor_top_right', 'main_corridor_center_h'],
        ['main_corridor_center_h', 'main_corridor_center_v'],
        ['main_corridor_center_v', 'main_corridor_bottom_right'],
        ['main_corridor_center_v', 'main_corridor_middle_left'],
        ['main_corridor_middle_left', 'main_corridor_bottom_left'],
        ['restroom_entry', 'main_corridor_top_right'], // Linking to restroom
        ['toys_entry', 'main_corridor_bottom_left'], // Linking to toys
        ['automotive_entry', 'main_corridor_middle_right'], // Linking to automotive
    ];

    let hoveredArea = null;
    let activeArea = null;
    let currentPath = []; // Stores the calculated path for drawing
    let pathAnimationProgress = 0; // 0 to 1, for drawing path segments

    // --- Animation Loop ---
    function animate() {
        // Smooth interpolation for pan and zoom
        currentScale += (targetScale - currentScale) * 0.1; // 10% movement towards target each frame
        currentTranslateX += (targetTranslateX - currentTranslateX) * 0.1;
        currentTranslateY += (targetTranslateY - currentTranslateY) * 0.1;

        // If a path is animating, update its progress
        if (currentPath.length > 0 && pathAnimationProgress < 1) {
            pathAnimationProgress += 0.03; // Speed of path drawing
            if (pathAnimationProgress > 1) pathAnimationProgress = 1;
        }

        drawMap();
        animationFrameId = requestAnimationFrame(animate);
    }

    // --- Drawing Functions ---
    function drawMap() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save the current transformation matrix
        ctx.save();

        // Apply transformations for pan and zoom
        ctx.translate(currentTranslateX, currentTranslateY);
        ctx.scale(currentScale, currentScale);

        // Draw each tenant area
        tenants.forEach(area => {
            const x = area.x * ORIGINAL_MAP_WIDTH;
            const y = area.y * ORIGINAL_MAP_HEIGHT;
            const width = area.width * ORIGINAL_MAP_WIDTH;
            const height = area.height * ORIGINAL_MAP_HEIGHT;

            ctx.fillStyle = area.color;
            if (area === hoveredArea) {
                ctx.fillStyle = '#00bfff'; // Lighter blue on hover
            }
            if (area === activeArea) {
                ctx.fillStyle = '#00bfff'; // Active color
            }

            ctx.fillRect(x, y, width, height);

            // Draw border if active
            if (area === activeArea) {
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 8 / currentScale; // Scale line width to appear consistent
                ctx.strokeRect(x, y, width, height);
            }

            // Draw text
            ctx.fillStyle = 'white';
            ctx.font = `bold ${20 / currentScale}px Segoe UI`; // Scale font size
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const maxTextWidth = width * 0.9;
            wrapText(ctx, area.name, x + width / 2, y + height / 2, maxTextWidth, 25 / currentScale);
        });

        // Draw "You Are Here" dot
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(YOU_ARE_HERE_MAP_X, YOU_ARE_HERE_MAP_Y, 15 / currentScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3 / currentScale;
        ctx.stroke();

        // Draw path (if active)
        if (currentPath.length > 0) {
            ctx.strokeStyle = '#FFFF00'; // Yellow path
            ctx.lineWidth = 10 / currentScale; // Path thickness
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            let totalPathLength = 0;
            const segmentLengths = [];

            // Calculate total path length and individual segment lengths
            for (let i = 0; i < currentPath.length - 1; i++) {
                const startNode = pathNodes[currentPath[i]];
                const endNode = pathNodes[currentPath[i+1]];
                const dx = endNode.x - startNode.x;
                const dy = endNode.y - startNode.y;
                const segmentLength = Math.sqrt(dx * dx + dy * dy);
                segmentLengths.push(segmentLength);
                totalPathLength += segmentLength;
            }

            let currentAnimatedLength = totalPathLength * pathAnimationProgress;
            let drawnLength = 0;
            let firstPoint = true;

            for (let i = 0; i < currentPath.length - 1; i++) {
                const startNode = pathNodes[currentPath[i]];
                const endNode = pathNodes[currentPath[i+1]];
                const segmentLength = segmentLengths[i];

                if (drawnLength + segmentLength <= currentAnimatedLength) {
                    // Draw full segment
                    if (firstPoint) {
                        ctx.moveTo(startNode.x, startNode.y);
                        firstPoint = false;
                    }
                    ctx.lineTo(endNode.x, endNode.y);
                    drawnLength += segmentLength;
                } else if (drawnLength < currentAnimatedLength) {
                    // Draw partial segment
                    const remainingLength = currentAnimatedLength - drawnLength;
                    const ratio = remainingLength / segmentLength;
                    const currentX = startNode.x + (endNode.x - startNode.x) * ratio;
                    const currentY = startNode.y + (endNode.y - startNode.y) * ratio;
                    if (firstPoint) {
                        ctx.moveTo(startNode.x, startNode.y);
                        firstPoint = false;
                    }
                    ctx.lineTo(currentX, currentY);
                    break; // Stop drawing after the partial segment
                } else {
                    break; // No more segments to draw
                }
            }
            ctx.stroke();
        }

        // Restore the un-transformed state of the canvas
        ctx.restore();
    }

    // Helper to wrap text on canvas
    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        // Adjust y to center the block of text
        const totalTextHeight = lines.length * lineHeight;
        let startY = y - (totalTextHeight / 2) + (lineHeight / 2);

        for (let i = 0; i < lines.length; i++) {
            context.fillText(lines[i].trim(), x, startY + (i * lineHeight));
        }
    }

    // --- Pathfinding Algorithm (Simplified Breadth-First Search) ---
    function findPath(startNodeId, endNodeId) {
        const queue = [[startNodeId]]; // Queue of paths to explore
        const visited = new Set();
        visited.add(startNodeId);

        while (queue.length > 0) {
            const currentPath = queue.shift();
            const lastNodeId = currentPath[currentPath.length - 1];

            if (lastNodeId === endNodeId) {
                return currentPath; // Path found!
            }

            // Find neighbors of the last node
            for (const [nodeA, nodeB] of paths) {
                let neighborId = null;
                if (nodeA === lastNodeId && !visited.has(nodeB)) {
                    neighborId = nodeB;
                } else if (nodeB === lastNodeId && !visited.has(nodeA)) {
                    neighborId = nodeA;
                }

                if (neighborId) {
                    visited.add(neighborId);
                    queue.push([...currentPath, neighborId]);
                }
            }
        }
        return null; // No path found
    }

    // --- Camera Control & Animation ---
    function setCamera(targetX, targetY, targetZ) {
        targetScale = targetZ;
        targetTranslateX = (canvas.width / 2) - (targetX * targetScale);
        targetTranslateY = (canvas.height / 2) - (targetY * targetScale);

        // Clamp translation to keep map within bounds (even during animation)
        clampTranslation(true); // pass true to use target values for clamping
    }

    function resetMapPosition() {
        targetScale = 1;
        targetTranslateX = 0;
        targetTranslateY = 0;
        currentPath = []; // Clear any active path
        pathAnimationProgress = 0; // Reset path animation
        drawMap(); // Immediate redraw for clarity
    }

    function clampTranslation(useTargets = false) {
        let tx = useTargets ? targetTranslateX : currentTranslateX;
        let ty = useTargets ? targetTranslateY : currentTranslateY;
        let sc = useTargets ? targetScale : currentScale;

        const scaledMapWidth = ORIGINAL_MAP_WIDTH * sc;
        const scaledMapHeight = ORIGINAL_MAP_HEIGHT * sc;

        const maxX = Math.max(0, (scaledMapWidth - canvas.width) / 2);
        const maxY = Math.max(0, (scaledMapHeight - canvas.height) / 2);

        if (scaledMapWidth > canvas.width) {
            tx = Math.max(Math.min(tx, maxX), -scaledMapWidth + canvas.width + maxX);
        } else {
            tx = (canvas.width - scaledMapWidth) / 2;
        }

        if (scaledMapHeight > canvas.height) {
            ty = Math.max(Math.min(ty, maxY), -scaledMapHeight + canvas.height + maxY);
        } else {
            ty = (canvas.height - scaledMapHeight) / 2;
        }

        if (useTargets) {
            targetTranslateX = tx;
            targetTranslateY = ty;
        } else {
            currentTranslateX = tx;
            currentTranslateY = ty;
        }
    }

    // --- Event Handlers ---

    // Populate Tenant Directory
    const filteredTenantsForList = tenants.filter(t => t.pathNode === 'toys_entry' || t.pathNode === 'restroom_entry' || t.pathNode === 'automotive_entry');
    filteredTenantsForList.forEach(tenant => {
        const listItem = document.createElement('li');
        listItem.textContent = tenant.name;
        listItem.dataset.tenantId = tenant.id; // Store ID for lookup
        tenantListElement.appendChild(listItem);
    });

    // Tenant List Click
    tenantListElement.addEventListener('click', (e) => {
        const listItem = e.target.closest('li');
        if (listItem && listItem.dataset.tenantId) {
            const selectedTenant = tenants.find(t => t.id === listItem.dataset.tenantId);
            if (selectedTenant && selectedTenant.pathNode) {
                activeArea = selectedTenant; // Highlight the selected tenant
                infoPanel.classList.add('visible');
                tenantName.textContent = selectedTenant.name;
                tenantDescription.textContent = selectedTenant.info;

                currentPath = findPath('you_are_here_start', selectedTenant.pathNode);
                if (currentPath) {
                    pathAnimationProgress = 0; // Start path animation

                    // Calculate path center for camera target
                    let pathCenterX = 0;
                    let pathCenterY = 0;
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

                    currentPath.forEach(nodeId => {
                        const node = pathNodes[nodeId];
                        pathCenterX += node.x;
                        pathCenterY += node.y;
                        minX = Math.min(minX, node.x);
                        maxX = Math.max(maxX, node.x);
                        minY = Math.min(minY, node.y);
                        maxY = Math.max(maxY, node.y);
                    });
                    pathCenterX /= currentPath.length;
                    pathCenterY /= currentPath.length;

                    // Calculate zoom level to fit path
                    const pathWidth = maxX - minX;
                    const pathHeight = maxY - minY;
                    const padding = 100; // Extra padding around path

                    const zoomX = canvas.width / (pathWidth + padding);
                    const zoomY = canvas.height / (pathHeight + padding);
                    const pathZoom = Math.min(zoomX, zoomY, 3); // Max zoom 3x for dramatic effect

                    setCamera(pathCenterX, pathCenterY, pathZoom);

                } else {
                    console.warn(`No path found for ${selectedTenant.name}`);
                    resetMapPosition();
                }
            }
        }
    });

    // Mouse move for hover effect (on canvas)
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const mapX = (mouseX - currentTranslateX) / currentScale;
        const mapY = (mouseY - currentTranslateY) / currentScale;

        let foundHovered = null;
        for (let i = tenants.length - 1; i >= 0; i--) {
            const area = tenants[i];
            const areaX = area.x * ORIGINAL_MAP_WIDTH;
            const areaY = area.y * ORIGINAL_MAP_HEIGHT;
            const areaWidth = area.width * ORIGINAL_MAP_WIDTH;
            const areaHeight = area.height * ORIGINAL_MAP_HEIGHT;

            if (mapX >= areaX && mapX <= areaX + areaWidth &&
                mapY >= areaY && mapY <= areaY + areaHeight) {
                foundHovered = area;
                break;
            }
        }

        if (hoveredArea !== foundHovered) {
            hoveredArea = foundHovered;
            drawMap();
        }
    });

    // Mouse click for selecting area (on canvas)
    canvas.addEventListener('click', (e) => {
        // Prevent click if it was part of a drag operation
        if (Math.abs(e.clientX - lastX) > 5 || Math.abs(e.clientY - lastY) > 5) {
            // This click was likely part of a drag, ignore
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const mapX = (mouseX - currentTranslateX) / currentScale;
        const mapY = (mouseY - currentTranslateY) / currentScale;

        let clickedArea = null;
        for (let i = tenants.length - 1; i >= 0; i--) {
            const area = tenants[i];
            const areaX = area.x * ORIGINAL_MAP_WIDTH;
            const areaY = area.y * ORIGINAL_MAP_HEIGHT;
            const areaWidth = area.width * ORIGINAL_MAP_WIDTH;
            const areaHeight = area.height * ORIGINAL_MAP_HEIGHT;

            if (mapX >= areaX && mapX <= areaX + areaWidth &&
                mapY >= areaY && mapY <= areaY + areaHeight) {
                clickedArea = area;
                break;
            }
        }

        if (clickedArea) {
            activeArea = clickedArea;
            infoPanel.classList.add('visible');
            tenantName.textContent = activeArea.name;
            tenantDescription.textContent = activeArea.info;
            currentPath = []; // Clear path if clicking an area directly
            pathAnimationProgress = 0;

            // Zoom to clicked area (default zoom 2x)
            const areaPixelX = clickedArea.x * ORIGINAL_MAP_WIDTH;
            const areaPixelY = clickedArea.y * ORIGINAL_MAP_HEIGHT;
            const areaPixelWidth = clickedArea.width * ORIGINAL_MAP_WIDTH;
            const areaPixelHeight = clickedArea.height * ORIGINAL_MAP_HEIGHT;

            const centerX = areaPixelX + areaPixelWidth / 2;
            const centerY = areaPixelY + areaPixelHeight / 2;

            setCamera(centerX, centerY, 2); // Zoom level 2x
        } else {
            // Clicked outside any area, hide info panel and reset active state
            activeArea = null;
            infoPanel.classList.remove('visible');
            resetMapPosition();
        }
    });

    // Close info panel
    closeInfoButton.addEventListener('click', () => {
        infoPanel.classList.remove('visible');
        activeArea = null;
        resetMapPosition();
    });

    // Reset View button
    resetViewButton.addEventListener('click', () => {
        infoPanel.classList.remove('visible');
        activeArea = null;
        resetMapPosition();
    });

    // --- Panning Functionality ---
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        canvas.classList.add('grabbing');
        lastX = e.clientX;
        lastY = e.clientY;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId); // Stop animation during direct interaction
            animationFrameId = null;
        }
        e.preventDefault();
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;

        currentTranslateX += deltaX;
        currentTranslateY += deltaY;

        // Immediately update target translations to follow mouse
        targetTranslateX = currentTranslateX;
        targetTranslateY = currentTranslateY;

        clampTranslation(); // Clamp current values
        lastX = e.clientX;
        lastY = e.clientY;
        drawMap(); // Draw continuously while dragging
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.classList.remove('grabbing');
        // Restart animation loop after drag ends for smooth transitions
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(animate);
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        canvas.classList.remove('grabbing');
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(animate);
        }
    });

    // Initial setup
    resetMapPosition(); // Start at bird's eye view
    animationFrameId = requestAnimationFrame(animate); // Start animation loop
});