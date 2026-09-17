/**
 * "Client Products Mockup Prompt" — the art-direction brief for AI pack shots.
 *
 * Sections 1–23 are the approved master brief, kept verbatim so it can be
 * reviewed/updated by the marketing team without touching generation code.
 * Only the PROJECT-SPECIFIC INSTRUCTIONS block is filled in per pack.
 */

const MASTER_PROMPT = `Client Products Mockup Prompt

Create a photorealistic, ultra-premium commercial product photograph of a curated corporate gift box using ALL uploaded reference images as the primary source of truth.

The final image should look like a professionally art-directed product photograph created for a premium corporate gifting company website, catalogue, brochure and advertising campaign.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. INPUT ANALYSIS — IDENTIFY EVERY ASSET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

First inspect and understand every uploaded image before generating the final composition.

Classify the uploaded references into:

A. Gift box / packaging reference
B. Individual gift products
C. Brand logo
D. Brand colour / visual identity
E. Packaging artwork
F. Product-specific branding instructions
G. Additional visual references

The number of products can vary from project to project.

There is NO fixed product count.

Determine the complete product set from the uploaded images before creating the composition.

Every clearly identifiable gift product provided by the user must be treated as an actual product that needs to appear in the final scene.

Do not assume missing products.

Do not invent products.

Do not substitute products with similar-looking generic products.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. ABSOLUTE PRODUCT FIDELITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The uploaded product images are NOT inspiration.

They are the EXACT SOURCE-OF-TRUTH PRODUCTS.

Use the actual products shown in the uploaded references.

Preserve each product's:

• Exact shape
• Silhouette
• Dimensions and proportions
• Colour
• Material
• Surface finish
• Texture
• Cap / lid
• Buttons
• Handles
• Hardware
• Seams
• Edges
• Labels
• Packaging
• Printed graphics
• Existing logos
• Typography
• Product-specific details

Do NOT redesign the products.

Do NOT simplify the products.

Do NOT reinterpret the products.

Do NOT replace them with visually similar products.

Do NOT create generic alternatives.

Do NOT merge two products into one.

Do NOT duplicate a product unless the uploaded reference itself clearly contains multiple units.

Do NOT remove important product details.

The final photograph must clearly depict the SAME REAL PRODUCTS supplied by the user.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. PRODUCT PACKAGING FIDELITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For packaged products such as chocolates, snacks, food items, stationery or other branded goods:

Preserve the original packaging design as accurately as possible.

Maintain:

• Packaging shape
• Colours
• Graphics
• Logos
• Typography
• Labels
• Product proportions
• Major visual details

Do not redesign commercial packaging.

Do not invent new packaging artwork.

Do not replace the supplied packaging with generic packaging.

Do not alter recognizable brand identities.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. GIFT BOX / PACKAGING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use the uploaded gift-box reference to determine the physical structure and construction of the box.

Preserve the reference box's:

• Overall proportions
• Shape
• Lid construction
• Opening mechanism
• Interior depth
• Wall thickness
• Edge construction
• Fold lines
• Compartments
• Inserts
• Overall physical geometry

If the user provides a specific box colour:

Use the specified brand/box colour accurately.

If NO specific packaging colour is provided:

MAKE THE GIFT BOX CLEAN MATTE WHITE BY DEFAULT.

Use a premium white or subtle warm off-white cardboard/paper finish.

Do not randomly introduce another box colour.

The box must look physically manufactured, not digitally drawn.

Create realistic:

• Cardboard texture
• Paper texture
• Edge thickness
• Folds
• Corners
• Surface imperfections
• Contact shadows
• Material reflections

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. BRAND COLOUR SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If a brand colour reference is provided:

Use the supplied brand colours accurately and consistently.

Brand colours may influence:

• Gift box
• Box interior
• Packaging details
• Tissue/filler
• Subtle accents
• Product branding
• Supporting visual elements

Do not invent additional brand colours unnecessarily.

If the brand has NO specific colour system:

Use a premium WHITE gift box.

The products themselves should provide most of the colour variation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. LOGO HANDLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If a brand logo is uploaded:

Use the EXACT supplied logo.

Do not redraw the logo.

Do not recreate the logo from memory.

Do not modify:

• Letterforms
• Typography
• Symbol
• Proportions
• Spacing
• Orientation
• Shape
• Brand mark

Never invent a new logo.

Never create a distorted logo.

Never use an approximate version of the logo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. CUSTOM LOGO APPLICATION TO SPECIFIC PRODUCTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The user may provide a logo that should be applied to ONLY certain products.

DO NOT automatically place the logo on every product.

The user's product-specific branding instructions take priority.

Example:

BRANDING MAP:

Apply logo to:
• Notebook
• Water bottle
• Pen

Do NOT apply logo to:
• Chocolates
• Snack packets
• Keychain

Follow the user's instructions exactly.

A product should receive the additional logo ONLY when it is explicitly designated for branding.

Do not assume that all products in the gift box belong to the same branding treatment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. REALISTIC LOGO APPLICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When applying the supplied logo to a specific product, make it look like professionally manufactured product branding.

The logo must physically belong to the product.

Choose the most appropriate real-world branding technique based on the product material.

Possible techniques include:

Metal:
• Laser engraving
• Etching
• UV print

Leather / faux leather:
• Embossing
• Debossing
• Foil stamping
• Subtle print

Plastic:
• Screen printing
• UV printing
• Pad printing

Glass:
• Frosted print
• UV print
• Engraving

Fabric:
• Embroidery
• Screen printing
• Woven branding

Paper / cardboard:
• High-quality commercial printing
• Foil stamping
• Embossing

Notebook:
• Embossed logo
• Debossed logo
• Foil logo
• Clean printed logo

Pen:
• Precise laser engraving
• Small screen-printed logo

Bottle:
• UV print
• Laser engraving
• Clean screen print

Select whichever treatment looks most realistic for the supplied product.

DO NOT make the logo look like a flat sticker unless the supplied reference specifically indicates a sticker.

The logo must follow the physical surface of the product.

On curved products:

• Follow the curvature
• Follow the perspective
• Maintain correct proportions
• Maintain realistic scale

On textured products:

• Integrate naturally with the material
• Respect the surface texture

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. LOGO POSITION AND SCALE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If the user specifies the exact logo position:

Follow it exactly.

If the user specifies the logo colour:

Use that colour exactly.

If the user specifies logo size:

Follow the specified size.

If the user specifies only the product but NOT the exact logo position:

Choose the most commercially appropriate placement automatically.

Position the logo in a clean, visible branding area.

Do not place the logo over:

• Buttons
• Controls
• Handles
• Seams
• Zippers
• Existing logos
• Important labels
• Functional elements

Keep the logo appropriately sized.

Avoid oversized or distracting branding — but never so small that it cannot be read clearly. Legibility comes first.

The result should look like a real corporate merchandise production sample.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. EXISTING PRODUCT BRANDING VS NEW BRANDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

There are two types of branding:

1. EXISTING PRODUCT BRANDING
2. NEW CUSTOM BRAND LOGO

Existing product branding visible in the uploaded product reference must be preserved.

New custom branding must ONLY be applied according to the user's branding map.

Never overwrite an existing manufacturer logo or important packaging artwork unless the user explicitly instructs you to do so.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. PRODUCT ARRANGEMENT INSIDE THE BOX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arrange all supplied products inside the gift box as a professionally curated premium corporate gift hamper.

The composition should feel:

• Balanced
• Intentional
• Elegant
• Premium
• Practical
• Visually appealing

Use product hierarchy:

Large products:
→ Form the visual foundation.

Medium products:
→ Create structure and balance.

Small products:
→ Fill visual gaps and support the composition.

Arrange products naturally with realistic physical contact.

Products must NOT:

• Float
• Intersect unnaturally
• Pass through each other
• Clip through the box
• Appear weightless
• Have impossible angles

Maintain realistic scale between all products.

Do not overcrowd the gift box.

Every important product should remain sufficiently visible.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. BOX FILLER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If no specific interior filler is provided:

Use premium white shredded/crinkle paper filler.

The filler should:

• Naturally surround the products
• Support products physically
• Create depth
• Add premium packaging realism
• Partially fill empty spaces

Do not allow filler to cover important product details.

If a custom insert or tray is supplied, use that instead.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. BACKGROUND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Unless another background is specifically requested, recreate the overall background mood of the reference:

PREMIUM DARK WINE-RED / BURGUNDY STUDIO BACKGROUND.

Use a sophisticated deep wine-red environment with subtle tonal variation.

Approximate colour direction:

Deep burgundy / wine red
approximately #5A0718 to #7A1828

The background should have:

• Deep wine-red tone
• Subtle gradient
• Slightly darker edges
• Smooth studio surface
• Soft atmospheric falloff
• Premium cinematic mood
• Very subtle reflection when appropriate

The background must NOT become bright red.

Avoid:

• Busy environments
• Office interiors
• Tables with unrelated objects
• People
• Furniture
• Plants
• Decorative props
• Random objects

The gift box must remain the hero subject.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. LIGHTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create a professional luxury commercial photography lighting setup.

Use:

• Large soft key light
• Controlled fill light
• Gentle rim light
• Soft realistic shadows
• Natural contact shadows
• Subtle highlights
• Controlled reflections

Lighting should clearly reveal every important product.

Metallic objects should have realistic highlights.

Dark products should retain detail without becoming flat.

White packaging should retain subtle surface definition.

Avoid:

• Harsh flash
• Overexposure
• Excessive HDR
• Unrealistic glow
• Plastic-looking lighting
• Completely flat lighting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. CAMERA ANGLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use a premium three-quarter elevated product-photography perspective.

Camera angle:

Approximately 30–45 degrees above the gift box, looking slightly downward into the open box.

The composition should show:

• Complete gift box
• Open lid
• Box interior
• All important products
• Product branding
• Filler
• Physical depth of the packaging

The camera should feel like a professional commercial product photographer's camera.

Use realistic photographic perspective.

Do not create an exaggerated wide-angle distortion.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. COMPOSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The gift box is the HERO.

Create an intentional luxury catalogue composition.

Use:

• Strong visual hierarchy
• Balanced negative space
• Natural product overlap
• Clear product visibility
• Elegant spacing
• Realistic depth

The image should immediately communicate:

PREMIUM CORPORATE GIFTING.

Do not make the composition look like a random collection of objects placed inside a box.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. MATERIAL REALISM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Everything must look physically real.

Accurately reproduce materials such as:

• Matte cardboard
• Coated cardboard
• Paper
• Shredded paper
• Fabric
• Leather
• Faux leather
• Metal
• Plastic
• Glass
• Chocolate wrappers
• Printed packaging
• Rubber
• Wood

Use realistic micro-textures.

Include subtle real-world imperfections.

Avoid the overly perfect CGI appearance often seen in AI-generated images.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. DEPTH OF FIELD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use professional commercial photography depth of field.

The gift box and primary products should remain sufficiently sharp.

Use subtle background separation.

Do NOT excessively blur the products.

Product branding and important product details must remain readable and visually recognizable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. PHOTOREALISM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The final result must look like a REAL PROFESSIONAL PHOTOGRAPH.

Not:

• Illustration
• 3D cartoon
• Vector artwork
• Graphic design composition
• Digital collage
• CGI-looking render
• Concept art

It should look like a high-end studio photograph captured with a professional camera and carefully retouched for commercial use.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20. IMAGE QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate the highest possible image quality and resolution.

Prioritize:

• Extremely sharp product details
• Clean edges
• Accurate geometry
• Realistic materials
• Natural shadows
• Accurate reflections
• Realistic perspective
• Professional colour grading
• Premium commercial retouching

The final image should be suitable for:

• Website product pages
• Corporate gifting catalogue
• Social media
• Digital advertising
• Presentation decks
• Marketing campaigns

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
21. STRICT NEGATIVE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO NOT:

• Invent products
• Replace supplied products
• Change product identity
• Change product proportions
• Change important product colours
• Redesign packaging
• Invent logos
• Distort logos
• Duplicate products unnecessarily
• Remove important products
• Add random props
• Add people
• Add hands
• Add unrelated objects
• Add unnecessary text
• Add watermarks
• Create floating products
• Create impossible object intersections
• Create warped packaging
• Create melted objects
• Create malformed products
• Create incorrect reflections
• Create excessive lens distortion
• Create excessive blur
• Create artificial HDR
• Make the image look like a 3D render

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
22. REFERENCE PRIORITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When there is a conflict between creative interpretation and an uploaded
reference image, ALWAYS prioritize the uploaded reference.

REFERENCE IMAGES = SOURCE OF TRUTH.

Creative freedom is allowed ONLY for:

• Art direction
• Camera angle
• Composition
• Lighting
• Shadows
• Product arrangement
• Background
• Depth of field
• Realistic material rendering

Creative freedom is NOT allowed for:

• Product identity
• Product shape
• Product colour
• Product packaging
• Existing product branding
• Supplied logo
• Supplied artwork
• Brand identity
• User-specified logo placement

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
23. FINAL ART DIRECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create the final image as if it were commissioned by a premium corporate
gifting company for a luxury product catalogue.

Overall visual language:

PREMIUM
MINIMAL
MODERN
CORPORATE
ELEGANT
LUXURIOUS
CLEAN
PHOTOREALISTIC
COMMERCIAL
CINEMATIC

The final photograph should communicate quality, trust, sophistication
and premium corporate gifting.

The gift box and the EXACT supplied products must remain the focus.

FINAL PRINCIPLE:

"Creative freedom applies to the photography and art direction,
NOT to the supplied products, packaging or branding."`;

const RULE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

/** How the selected box is built, opened and branded — drives every box instruction. */
export interface BoxConstruction {
  /** Construction, told to the model (the box's name itself is never sent). */
  type: string;
  /** How to show it opened with the products inside. */
  open: string;
  /** Box-structure lines for the final check. */
  checks: string[];
  /** The face that carries the client logo or the "YOUR LOGO HERE" placeholder. */
  logoFace: string;
}

/**
 * Work out the box construction from its catalogue name + description. The
 * prompt used to assume a lid-and-base box everywhere ("rest the lid beside
 * the base", even "do NOT turn it into a drawer or sleeve box"), so a selected
 * Slider Box came back as a Top Bottom Box.
 */
export function boxConstruction(name?: string | null, description?: string | null): BoxConstruction {
  const text = `${name || ''} ${description || ''}`.toLowerCase();

  if (/slid|drawer|sleeve/.test(text)) {
    return {
      type: 'a slider (drawer) box — a rigid outer sleeve with an inner tray that slides out of it',
      open: 'Show the inner tray pulled most of the way out of the outer sleeve (the sleeve still around the back part of the tray), with the products packed inside the tray. This box has NO lid.',
      checks: [
        'The box is a slider box exactly like Image 1: ONE outer sleeve and ONE inner tray sliding out of it. It has NO lid — never add a lid, hinged top or flap, and never turn it into a lid-and-base box.',
      ],
      logoFace: 'the top face of the outer sleeve',
    };
  }

  if (/magnet|hinge|flip|pizza/.test(text)) {
    return {
      type: 'a hinged-lid box — the lid is permanently attached to the base along one edge',
      open: 'Show the lid swung open and still attached along its hinge edge (standing upright or tilted back), with the products packed inside the base. The lid is NOT a separate piece.',
      checks: [
        'The box has ONE lid that stays attached to the base along its hinge edge, exactly like Image 1. Never detach the lid or show a separate loose lid.',
      ],
      logoFace: 'the outside face of the hinged lid',
    };
  }

  if (/top.?bottom|lid.and.base|two.piece|telescop/.test(text)) {
    return {
      type: 'a two-piece lid-and-base box — a base plus a separate lid that lifts fully off',
      open: 'Show the base holding the products, with the removed lid resting on the surface beside the base or leaning behind it.',
      checks: [
        'The box is ONE base and ONE separate lid. The base has no hinged flap, fold-over top or second lid attached to it — there is only one lid in the whole image.',
        'The lid rests beside the base or leans behind it. It never floats over, covers or cuts through the products.',
      ],
      logoFace: 'the top face of the separate lid',
    };
  }

  return {
    type: 'exactly the construction shown in Image 1',
    open: 'Open the box the way it is built in Image 1 (its own flaps, lid or tray, as the photo shows) and pack the products inside. Do not invent a different closure.',
    checks: [
      'The box keeps exactly the construction of Image 1 — the same flaps, lid or tray. Never add a lid, flap, sleeve or tray it does not have.',
    ],
    logoFace: 'the main top or front face of the box',
  };
}

/**
 * Product-fidelity rules, sent before the product photos. Client feedback: the
 * model swapped selected products for look-alikes (a flat-top bottle became a
 * round-shouldered one), duplicated items, and turned a photo showing five
 * colour variants or a detachable lid into extra products.
 */
const PRODUCT_FIDELITY_RULES = `PRODUCT ACCURACY IS THE TOP PRIORITY — above creativity, composition and style.
Each product image that follows is a photo of the REAL product the client selected. Put THAT exact product into the box, as if its photo were cut out and placed into the scene:
• Copy its exact shape, silhouette, proportions, colour, material, finish, lid or cap, handle, hardware, labels and existing branding.
• Do NOT redesign, restyle, simplify or "improve" it. Do NOT replace it with a similar-looking, generic or AI-imagined version (for example, a flat-top cylindrical bottle must never become a round-shouldered bottle).
• EXACTLY ONE UNIT of each product. If a photo shows several units or colour variants of the same product, show only ONE of them — copied exactly — never all of them.
• Parts that belong to a product (a detachable lid, a cap, a strap) stay with that product; they are not separate items. Drinks or props shown with a non-food product (coffee in a mug, pencils in a stand) are NOT included.
• A product photographed with its own packaging (its gift box, sleeve or tin) is ONE item — keep those pieces together as that single product; never split it into several separate items.
• A product that is itself a basket, hamper or gift set is ONE item — show it whole, as in its photo; never unpack it, leave it out or replace it with loose contents.
• Every product must be clearly visible and recognisable — none hidden behind another, buried in filler or left out. Place small or flat items at the front, on top of the filler.
• Products of a similar type (for example a ceramic mug and a steel travel mug) are DIFFERENT items — show each once, each looking like its own photo.
• Never add a product that is not in the list. Never show any product twice.`;

/**
 * Legibility rules for branding on products. With 4–5 products each item is
 * small in the frame, and "small, neat" placeholders came out as garbled
 * micro-text — so size, lettering, contrast and visibility are spelled out.
 */
function brandingLegibilityRules(hasLogo: boolean): string {
  const mark = hasLogo ? 'client logo' : '"YOUR LOGO HERE" placeholder';
  return `BRANDING LEGIBILITY — applies to every ${mark}, on the box and on each branded product, however many products are in the box:
${
  hasLogo
    ? '• Reproduce the supplied logo exactly — same shapes, lettering, spelling and proportions. Never redraw, simplify, stretch or blur it, even when it is small.'
    : '• Spelled exactly YOUR LOGO HERE — three words, eleven letters, all capitals, in a clean bold sans-serif. Every letter fully formed and evenly spaced: no missing, extra, merged, mirrored or garbled letters.'
}
• One solid colour that clearly contrasts with the surface — dark on light surfaces, white or metallic on dark ones.
• Large enough to read at a glance: on a product it spans roughly one third to one half of the width of the visible face. Never tiny micro-text.${
    hasLogo
      ? ''
      : ' On narrow items (pens, bottles, flasks) stack the three words on two or three short centred lines, or run them along the barrel, instead of shrinking them.'
  }
• Placed on a flat or gently curved area that faces the camera. Turn each branded product so that face is fully visible — never wrapped round an edge, cut off, or covered by filler, another product or the box wall.
• Placed beside the product's own manufacturer branding, never on top of it.
• Arrange the box so every branded product keeps its branded face unobstructed; give branded items front or clear positions before shrinking their branding.`;
}

/** Sent right after the box photo (Image 1): turns the job into an edit of that box. */
export function boxEditLead(
  productCount: number,
  hasLogo: boolean,
  construction: BoxConstruction,
  /** Brand colour to recolour the box to (mockup tool). Null keeps the photo colour. */
  boxColour: string | null = null
): string {
  // The box's catalogue name is deliberately NOT sent — the model kept printing
  // it ("TOP BOTTOM BOX") on the lid. Only its construction is described.
  return `Image 1 above is the photo of the gift box selected for this pack.

YOUR TASK IS TO EDIT IMAGE 1 — NOT TO DESIGN A NEW BOX.
Keep this exact box: the same shape, proportions, construction, ${boxColour ? "" : "colour, "}finish and material as in Image 1.${boxColour ? ` RECOLOUR the box to ${boxColour} — the client brand colour — on every outside and inside surface, keeping the same material and finish. This is the only change allowed to the box.` : ""}
This box is ${construction.type}. Never turn it into a different box style.
Pack EXACTLY ${productCount} product${productCount === 1 ? '' : 's'} — the ones shown in the following images, nothing else — inside THIS box, nested in white shredded paper filler.
${construction.open}
You may adjust the camera angle slightly, but the box itself must remain recognisably identical to Image 1.
If Image 1 shows more than one box (for example an open one and a closed one), it is the same box shown twice — use only ONE box, opened as described above.
Apart from the "YOUR LOGO HERE" placeholder or the client logo, any words printed on the box in Image 1 are mock-up text, not real artwork — do not reproduce them. Keep non-text graphics such as handling icons.
${
    hasLogo
      ? `The client logo is supplied as the LAST image — print it on ${construction.logoFace} in place of any "YOUR LOGO HERE" placeholder from Image 1, and on the products marked for branding in the BRANDING MAP (only those).`
      : `No client logo is supplied. Keep the box's non-text graphics (such as handling icons) as shown in Image 1, but the ONLY words on the box are ONE "YOUR LOGO HERE" placeholder on ${construction.logoFace}. Also put a neat, clearly legible "YOUR LOGO HERE" placeholder on the products marked for branding in the BRANDING MAP (only those). Every placeholder reads exactly "YOUR LOGO HERE" — never add a tagline, extra words or made-up text under it. Do not add any other logo or text.`
  }

${brandingLegibilityRules(hasLogo)}

${PRODUCT_FIDELITY_RULES}

The products to pack follow:`;
}

/** Last instruction in the request — models weigh the final text heavily. */
export function boxFinalCheck({
  hasLogo = false,
  brandedProducts = [],
  productLabels,
  construction,
  boxColour = null,
}: {
  hasLogo?: boolean;
  /** Brand colour the box is recoloured to. Null keeps the photo colour. */
  boxColour?: string | null;
  brandedProducts?: string[];
  /** How the selected box is built — its structure rules and logo face. */
  construction: BoxConstruction;
  /** Every selected product, in order — the exact contents the image must show. */
  productLabels: string[];
}): string {
  const n = productLabels.length;
  return `FINAL CHECK BEFORE GENERATING — COUNT EVERYTHING:
• The box contains EXACTLY ${n} item${n === 1 ? '' : 's'} — no more, no fewer:
${productLabels.map((label, i) => `   ${i + 1}. ${label} — 1 unit`).join('\n')}
• Each of those items appears ONCE. No product is duplicated — never two mugs, two bottles, two pens or two of anything.
• ALL ${n} items are clearly visible — none hidden, buried in filler or left out. Small or flat items sit at the front, on top of the filler.
• A product shown with its own gift box, sleeve or tin still counts as ONE item — its pieces stay together, never split into extra items.
• Each item looks like ITS OWN reference photo — same shape, colour, material and details. No generic, restyled or look-alike substitutes.
• Nothing else inside or around the box: no extra products, cups, loose lids, stationery or props that are not part of a listed product.
• The ONLY box in the image is the box from Image 1 — same shape, proportions and construction${boxColour ? `, recoloured to ${boxColour}` : " and colour"}.
• No other box, tray, hamper, basket, bag or packaging of any kind.
${construction.checks.map((c) => `• ${c}`).join('\n')}
• Only ONE box appears in the whole image — even if Image 1 shows the box twice (open and closed).
• The box walls stay plain and solid exactly as in Image 1 — never merge a product into the box structure (no windows or compartments added to the box itself).
${
  hasLogo
    ? `• The client logo is printed on ${construction.logoFace}, exactly as supplied, angled so it is clearly visible to the camera.${
        brandedProducts.length > 0
          ? ` It is ALSO applied to: ${brandedProducts.join(', ')} — each with its own branding method. No logo on any other product.`
          : ' No logo on any product.'
      }`
    : `• No client logo. The box keeps the non-text graphics of Image 1, and its ONLY words are ONE "YOUR LOGO HERE" placeholder on ${construction.logoFace} — no other words from Image 1 and no extra lines of text.${
        brandedProducts.length > 0
          ? ` A clearly legible "YOUR LOGO HERE" placeholder is ALSO shown on: ${brandedProducts.join(', ')} — each with its own branding method, once per product. No placeholder or logo on any other product.`
          : ' No logo or placeholder on any product.'
      }`
}
• Every "YOUR LOGO HERE" placeholder reads exactly those three words — no tagline, small print, extra words or made-up text under or around it.
• READ EVERY ${hasLogo ? 'LOGO' : 'PLACEHOLDER'} BACK, one product at a time${
    brandedProducts.length > 0 ? ` (${brandedProducts.join(', ')})` : ''
  }: ${
    hasLogo
      ? 'it matches the supplied logo exactly'
      : 'it spells Y-O-U-R L-O-G-O H-E-R-E with every letter crisp and correct'
  }, it is big enough to read at a glance, it contrasts with the surface, it faces the camera and nothing covers it. If any one is tiny, blurred, misspelled, warped or partly hidden, enlarge it or turn/reposition that product and fix it before finishing.
• Count the ${hasLogo ? 'client logos' : '"YOUR LOGO HERE" placeholders'}: exactly ${1 + brandedProducts.length} in the whole image — ONE on ${construction.logoFace}${
    brandedProducts.length > 0 ? ' and one on each branded product listed above' : ''
  }. None on inner walls, the inside of a lid, the front of a tray or any other surface of the box.
• Never print any other new text or words on the box or products — only the artwork Image 1 already shows${
    hasLogo ? ', or the client logo' : ', or the "YOUR LOGO HERE" placeholders listed above'
  }.
• Keep each product's real colour and material (e.g. a wooden pen stand stays natural wood, a black steel mug stays black steel).`;
}

export interface PromptProduct {
  /** "Name (Brand)" */
  label: string;
  hasImage: boolean;
  /** Catalogue material (e.g. "Stainless Steel") — helps keep shape and finish true. */
  material?: string | null;
  /** Set only when the catalogue gives the product a branding method — it then gets the client logo. */
  branding?: { technique: string; position?: string | null; logoColour?: string | null } | null;
}

/** Product-type words used to spot two similar items that must not be merged or duplicated. */
const PRODUCT_TYPE_WORDS = [
  'mug', 'cup', 'bottle', 'flask', 'tumbler', 'sipper', 'pen', 'pencil', 'notebook', 'diary',
  'journal', 'planner', 'bag', 'backpack', 'pouch', 'wallet', 'keychain', 'coaster', 'candle',
  'speaker', 'earbuds', 'charger', 'cable', 'chocolate', 'card', 'organiser', 'organizer',
  'stand', 'holder', 'lamp', 'clock', 'umbrella', 'towel', 'hoodie', 't-shirt',
];

/**
 * For every product type that appears more than once (a ceramic mug AND a
 * travel mug), an explicit "these are different items" line — the model
 * otherwise tends to draw two of one and drop the other.
 */
export function similarProductWarnings(products: { label: string }[]): string[] {
  const warnings: string[] = [];
  for (const word of PRODUCT_TYPE_WORDS) {
    const re = new RegExp(`\\b${word}s?\\b`, 'i');
    const matches = products.map((p, i) => ({ label: p.label, n: i + 1 })).filter((m) => re.test(m.label));
    if (matches.length > 1) {
      warnings.push(
        `• ${matches.map((m) => `#${m.n} "${m.label}"`).join(' and ')} are DIFFERENT products (both a kind of ${word}). Show each exactly once, each matching its own photo — never two of the same one.`
      );
    }
  }
  return warnings;
}

/** Human-readable PrintingTechnique values, as named in the branding map. */
export const PRINTING_TECHNIQUE_LABELS: Record<string, string> = {
  screen_print: 'Screen printing',
  uv_print: 'UV printing',
  embroidery: 'Embroidery',
  laser_engraving: 'Laser engraving',
  digital_print: 'Digital printing',
  emboss: 'Embossing',
};

/**
 * Master brief + the per-pack PROJECT-SPECIFIC INSTRUCTIONS. Reference images
 * are sent in this order: box (if it has a photo), then each product that has
 * a photo — the numbering below mirrors that exactly.
 */
export function buildPackImagePrompt({
  boxName,
  boxDescription,
  hasBoxImage,
  hasLogo = false,
  boxColour = null,
  products,
}: {
  /** Used only to work out the box construction — never put in the prompt (the model printed it on the lid). */
  boxName?: string | null;
  boxDescription?: string | null;
  hasBoxImage: boolean;
  /** Brand colour for the box (mockup tool). Null keeps the colour of the box photo. */
  boxColour?: string | null;
  /** A client logo image is sent last — it goes on the box lid only. */
  hasLogo?: boolean;
  products: PromptProduct[];
}): string {
  let imageNo = 0;
  const refs: string[] = [];
  if (hasBoxImage) refs.push(`• Image ${++imageNo} — Gift box reference`);
  const productLines = products.map((p, i) => {
    const ref = p.hasImage
      ? `copy exactly from reference image ${++imageNo}`
      : 'no photo — render a faithful, realistic version from the name';
    if (p.hasImage) refs.push(`• Image ${imageNo} — Product ${i + 1}: ${p.label}`);
    return `${i + 1}. ${p.label}${p.material ? ` — ${p.material}` : ''} (${ref}) — exactly 1 unit`;
  });
  const similarWarnings = similarProductWarnings(products);
  const construction = boxConstruction(boxName, boxDescription);

  // The client logo is the last reference image, after every product.
  const logoImageNo = hasLogo ? ++imageNo : null;
  if (logoImageNo) refs.push(`• Image ${logoImageNo} — Client brand logo`);

  // With a logo: box lid only, never products. Without: the box keeps whatever
  // artwork its photo already shows (placeholder included) — nothing is added.
  // With a logo it goes on the box lid, plus ONLY the products the catalogue
  // gives a branding method (embroidery, laser engraving…) — using that method.
  const applyTo = [
    ...(hasBoxImage
      ? [
          `• The gift box — centred on ${construction.logoFace}, as a clean premium print or foil stamp that follows that surface. It replaces any "YOUR LOGO HERE" placeholder shown on the box in Image 1.`,
        ]
      : []),
    ...products
      .filter((p) => p.branding)
      .map(
        (p) =>
          `• ${p.label} — ${p.branding!.technique}${
            p.branding!.logoColour ? `, logo colour: ${p.branding!.logoColour} (use exactly this colour)` : ''
          }${
            p.branding!.position ? `, position: ${p.branding!.position}` : ', in its most natural visible branding area'
          } (realistic ${p.branding!.technique.toLowerCase()} that follows the product surface, sized to read clearly at a glance)`
      ),
  ];
  if (applyTo.length === 0) applyTo.push('• Nothing — no surface in this pack is marked for branding.');
  const skipLogo = products
    .filter((p) => !p.branding)
    .map((p) => `• ${p.label} — no logo; keep it exactly as in its reference`);
  if (skipLogo.length === 0) skipLogo.push('• Nothing else — no logo on the filler, background or any other surface.');

  // No client logo: the same branded products carry a "YOUR LOGO HERE"
  // placeholder instead, so the client still sees where branding goes.
  const placeholderOn = products
    .filter((p) => p.branding)
    .map(
      (p) =>
        `• ${p.label} — "YOUR LOGO HERE" as ${p.branding!.technique.toLowerCase()}${
          p.branding!.logoColour ? `, in ${p.branding!.logoColour}` : ''
        }${
          p.branding!.position ? `, position: ${p.branding!.position}` : ', in its most natural visible branding area'
        } (clean, crisp and clearly legible, following the product surface)`
    );
  if (placeholderOn.length === 0) placeholderOn.push('• Nothing — no product in this pack is marked for branding.');

  const branding = logoImageNo
    ? `BRAND LOGO:
Use the uploaded client logo (Image ${logoImageNo}) exactly — do not redraw, distort or approximate it. ${products.some((p) => p.branding?.logoColour) ? 'Keep its original colours, EXCEPT on products where the BRANDING MAP names a logo colour — there render the very same logo shape in that single colour (as engraving, foil or one-colour print would).' : 'Do not recolour it.'}

BRANDING MAP:

Apply the logo to:
${applyTo.join('\n')}

DO NOT apply the logo to:
${skipLogo.join('\n')}

Angle the box so ${construction.logoFace} and the logo on it are clearly visible to the camera.

${brandingLegibilityRules(true)}`
    : `BRAND LOGO:
No client logo supplied — a "YOUR LOGO HERE" placeholder is used instead, showing where the client's logo will go.

BRANDING MAP:
The box shows ONE "YOUR LOGO HERE" placeholder on ${construction.logoFace} and keeps the non-text graphics of the box reference. No other words from the box photo appear.

Show a neat, clearly legible "YOUR LOGO HERE" placeholder on:
${placeholderOn.join('\n')}

DO NOT put any logo or placeholder on:
${skipLogo.join('\n')}

Preserve the existing manufacturer branding visible in each product reference.

${brandingLegibilityRules(false)}`;

  // Catalogue box photos are studio shots (coloured backdrop, "YOUR LOGO HERE"
  // mock-ups) — without these rules the model recoloured the box to the
  // backdrop and swapped a top-bottom box for a hinged one.
  const box = hasBoxImage
    ? [
        'Use the uploaded gift-box reference (Image 1). This is the ONLY box allowed in the image.',
        boxDescription ? `Box details: ${boxDescription}` : null,
        `Box construction: ${construction.type}. Reproduce exactly the construction shown in Image 1 — never turn it into a different box style.`,
        construction.open,
        'This overrides the "open lid" wording in sections 15 and 16: show the box opened the way THIS box is actually built.',
        hasLogo
          ? 'Image 1 is a studio photo: its background colour is NOT the box colour. Any "YOUR LOGO HERE" placeholder on the box is replaced by the client logo (see BRANDING MAP).'
          : 'Image 1 is a studio photo: its background colour is NOT the box colour. Keep any artwork printed on the box exactly as shown.',
      ]
        .filter(Boolean)
        .join('\n')
    : 'No box reference supplied — use a premium rigid gift box with a separate lid.';

  const boxColourLine = hasBoxImage
    ? boxColour
      ? `${boxColour} — the client brand colour. Recolour the whole box (outside and inside) to this colour, keeping the material, finish, shape and construction of the box in Image 1. Ignore the photo background.`
      : 'Exactly the colour and finish of the box itself in Image 1 — ignore the photo background. Never recolour the box to match the background.'
    : boxColour
      ? `${boxColour} — the client brand colour.`
      : 'White by default.';

  return `${MASTER_PROMPT}

${RULE}
PROJECT-SPECIFIC INSTRUCTIONS
${RULE}

REFERENCE IMAGES (in upload order):
${refs.length > 0 ? refs.join('\n') : '• None'}

BOX:
${box}

BOX COLOUR:
${boxColourLine}

${branding}

PRODUCTS (HIGHEST PRIORITY):
This gift box contains EXACTLY ${products.length} product${products.length === 1 ? '' : 's'}, each exactly ONCE:
${productLines.join('\n')}
${similarWarnings.length > 0 ? `\n${similarWarnings.join('\n')}\n` : ''}
These product rules OVERRIDE anything above that conflicts with them:
• Exactly ONE unit per product — even if its reference photo shows several units or colour variants (then show only one of them). This overrides the "multiple units" exception in section 2.
• Each product must be the exact product in its reference photo — never a similar-looking, generic, restyled or AI-imagined substitute. Do not change its shape, design, colour, branding or appearance.
• No duplicates and no extra items: the total number of items in the box is exactly ${products.length}.
• Detachable parts (lids, caps) and a product's own packaging (its gift box, sleeve or tin) stay with that product as ONE item. Drinks or props shown with non-food products are not included.
• A basket, hamper or gift-set product is ONE item, shown whole — never unpacked or left out.
• Every listed item must be clearly visible in the final image; small or flat items go at the front.
• Product identity and visual accuracy come before creativity and composition.

BACKGROUND:
Dark premium wine-red / burgundy studio background.

FRAMING (takes priority over the default composition where they differ):
Landscape 5:4 (near-square). Frame tightly so the PRODUCTS are the hero — the open box and its contents fill roughly 85–90% of the frame width, camera close and slightly elevated, minimal empty background.
Keep every product fully visible and uncropped; the box's lid, sleeve or flap may be partly cropped at the frame edge.

PRODUCT ARRANGEMENT:
Create the most premium and visually balanced arrangement possible
while keeping every supplied product recognizable and physically realistic.
Pack it the way a professional gift stylist would by hand: products sit snugly side by side on the filler, aligned to the box edges or fanned with clear intent, labels and logos facing the camera, tall items at the back and small or flat items in front. Nothing floats, tilts at random, sinks through the filler, overlaps so that another product is hidden, or pokes through the box walls. Every product rests with real weight and a soft contact shadow.

FINAL LOOK — A REAL PHOTOGRAPH, NOT AN AI RENDER:
Before finishing, plan the layout, then check the result against this list.
• It must look like a photo taken by a human product photographer in a studio on a full-frame camera (about 50–85mm, f/8): one large softbox key light from the upper left, gentle fill, natural falloff, true-to-life colour.
• Real material behaviour — paper fibre and board edges on the box, brushed or polished metal, fabric weave, matte versus gloss — with tiny natural imperfections. No plastic sheen, waxy smoothness, over-sharpening, HDR glow or airbrushed surfaces.
• All printed text, logos and labels are crisp, correctly spelled and follow the surface they are printed on — never warped, smeared, duplicated or invented.
• Straight, believable geometry: box walls are parallel, lids and corners are square, product proportions match their reference photos and their real sizes relative to each other.
• Clean and tidy: no stray objects, no clutter, no repeated or merged products, no extra hands, props or decorations.

NO ADDITIONAL PRODUCTS.
NO UNREQUESTED BRANDING.
NO UNREQUESTED PROPS.`;
}
