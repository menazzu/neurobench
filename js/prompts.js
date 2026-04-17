const PromptsModule = (() => {
    let promptsData = {};

    async function loadPrompts() {
        try {
            const data = await Api.getPrompts();
            promptsData = data;
        } catch {
            promptsData = getDefaultPrompts();
        }
        return promptsData;
    }

    function getDefaultPrompts() {
        return {
            easy: [
                "Generate an SVG illustration of a minimalist glass hourglass. On hover, the hourglass flips 180 degrees in a smooth ease-in-out rotation, and sand particles immediately begin dropping to fill the bottom chamber with a rising geometric wave effect. Golden yellow and frosted cyan color palette on a dark navy background.",
                "Generate an SVG illustration of a minimalist closed hardcover book. On hover, the book cover flips open with a 3D perspective stretch, and tiny glowing geometric stars and circles float upwards from the pages in an endless, fading fountain animation. Midnight blue and gold foil flat vectors on a soft gray background.",
                "Generate an SVG illustration of a minimalist isometric file folder. On hover, the folder's front flap opens smoothly, and a paper document with abstract lines of text slides upward from inside the folder with a bouncy spring animation. Slate gray and crisp white color palette with subtle vector drop shadows.",
                "Generate an SVG illustration of a minimalist scientific atom symbol. On hover, three elliptical electron orbits start spinning around the center in continuous 3D-like loops at different speeds, while the central nucleus gently pulses in size. Electric purple and glowing magenta color palette on a pitch-black background.",
                "Generate an SVG illustration of a minimalist vintage record player. On hover, the vinyl record spins infinitely, and three concentric audio frequency waves project from the needle, expanding and fading out in a rhythmic sine-wave animation. Retro mustard yellow and dark teal flat vectors on a cream background.",
                "Generate an SVG illustration of a minimalist futuristic battery capsule. On hover, the internal energy core fills up from bottom to top with a glowing stepped effect, and small rectangular energy sparks float upwards inside the glass and dissolve. Neon cyan and deep charcoal color palette on a dark slate background.",
                "Generate an SVG illustration of a minimalist potted plant with a single curved stem. On hover, three geometric leaves scale up smoothly from the stem, and an abstract flower blooms at the very top with a continuously rotating petal animation. Earthy greens and vibrant terracotta color palette on a transparent background.",
                "Generate an SVG illustration of a minimalist closed geometric eye. On hover, the top and bottom eyelids slide apart to reveal a bright iris that smoothly tracks side-to-side, while an array of sharp eyelashes fans out around the perimeter. Monochromatic dark slate and striking glowing orange flat vectors.",
                "Generate an SVG illustration of a minimalist spaceship resting on a launchpad. On hover, the rocket shakes slightly before launching vertically out of the frame, leaving behind a trail of expanding, overlapping circular smoke clouds that slowly fade out. Crimson red and metallic silver color palette on a midnight background.",
                "Generate an SVG illustration of a minimalist weather thermometer. On hover, the internal liquid shoots to the top with a fluid bouncy effect, the outer shape morphs slightly to simulate heat expansion, and three distinct heat radiation rings ripple outward from the top bulb. Vivid crimson and icy blue flat vectors.",
                "Generate an SVG illustration of a minimalist isometric coffee mug. On hover, coffee levels rise inside the mug with a liquid wave animation, and three wisps of steam emerge from the top, moving upwards in a fading loop. Warm brown and beige flat vectors.",
                "Generate an SVG illustration of a minimalist sun icon. On hover, the sun smoothly transitions into a fluffy rain cloud; the sunbeams fade out while blue raindrops drop sequentially from the bottom of the cloud in a bouncy animation. Pastel yellow and stormy blue color palette on a white background."
            ],
            medium: [
                "Create a stunning interactive SVG illustration of a 'Weather Snowglobe'. The Container: A perfect circle acting as a glass globe (using radial gradients for a specular spherical highlight). Everything inside must be strictly masked by this circle using a <mask>. The Interaction (Toggle): Clicking the globe toggles the state between 'Sunny Day' and 'Midnight Storm'. The Transition: When clicked, the sky gradient slowly shifts from light blue to deep indigo. The sun smoothly translates downwards, while a crescent moon arcs upwards. The Particle System: In 'Storm' mode, dynamically generate SVG rain: multiple diagonal dashed lines that animate downwards continuously in a staggered loop, accompanied by random, sudden white flashes mimicking lightning behind the clouds. State Memory: The animation between day and night must be a beautifully interpolated 2-second transition.",
                "Create a stunning interactive SVG illustration of an 'Alchemist's Flask'. The Container: An Erlenmeyer flask shape made of thick glass with a specular glass reflection. Everything inside MUST be strictly contained using a precise <clipPath>. The Interaction (Toggle): Clicking toggles between 'Healing Elixir' and 'Toxic Acid'. The Transition: Liquid gradient smoothly interpolates over 1.5 seconds from ruby-red to neon-green with a sloshing wave effect. The Particle System: At least 8 bubbles spawn, scale up, and rise. In 'Toxic' state, bubbles move 3x faster with 3 wisps of toxic green smoke. State Memory: Glass reflection and flask stroke remain static.",
                "Create a stunning interactive SVG illustration of an 'Abyssal Submarine Porthole'. The Container: A thick, rusted iron circular frame with heavy rivets. Ocean view masked by a circle. The Interaction (Toggle): Clicking toggles depth from 'Sunlit Reef' to 'Midnight Trench'. The Transition: Over 3 seconds, water gradient shifts from vibrant turquoise to pitch black. Sunlight rays fade out. The Particle System: In 'Sunlit' mode, 3 fish silhouettes swim horizontally. In 'Trench' mode, fish dart away and a terrifying Anglerfish rises with a swinging glowing lure. State Memory: Continuous air bubbles rise in BOTH states, unaffected.",
                "Create a highly complex interactive SVG illustration of a 'Microscopic Petri Dish'. A circle lens with inner shadow via SVG <filter>, precisely clipped. Click toggles 'Dormant' and 'Active Mitosis'. A single cell stretches, pinches, and divides into two over 2 seconds. Background shifts from acidic green to blood-red. 12 tiny ribosomes float randomly (3x speed in Mitosis). 3 DNA helices rotate in 3D-like space. A hexagonal microscope grid pans diagonally in an infinite loop, unaffected by interactions.",
                "Create a stunning interactive SVG illustration of a 'Steampunk Mechanical Metronome'. A wooden pyramid chassis with brass gears. Click toggles 'Static' and 'Tempo Chaos'. A sliding weight drops, initiating swinging from the bottom pivot. Every time the needle hits max angle, steam puffs emit from brass valves. 3 interlocked brass gears constantly rotate; in 'Tempo Chaos' they triple speed.",
                "Create an immensely detailed interactive SVG illustration of a 'Four-Seasons Bonsai Terrarium'. A glass dodecahedron on a wooden desk. Click toggles 'Spring Bloom' and 'Autumn Decay'. Hundreds of tiny leaves crossfade from cherry-blossom pink to burnt amber over 2.5 seconds. Sky shifts from morning yellow to twilight purple. In 'Spring', pink petals sway and fall. In 'Autumn', dry brown leaves fall faster. A glowing blue water stream flows continuously via animated stroke-dashoffset, unaffected by transitions."
            ],
            hard: []
        };
    }

    function renderPrompts(difficulty) {
        const promptsContent = document.getElementById('prompts-content');
        if (!promptsContent) return;
        const prompts = promptsData[difficulty] || [];
        if (prompts.length === 0) {
            promptsContent.innerHTML = '<div class="empty-state">Скоро...</div>';
            return;
        }
        promptsContent.innerHTML = prompts.map((p, i) => `
            <div class="prompt-card">
                <span class="prompt-number">#${String(i + 1).padStart(2, '0')}</span>
                ${p}
            </div>
        `).join('');
    }

    function setupTabs() {
        const difficultyTabs = document.querySelectorAll('.difficulty-tab');
        difficultyTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                difficultyTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderPrompts(tab.getAttribute('data-difficulty'));
            });
        });
    }

    return { loadPrompts, renderPrompts, setupTabs };
})();
