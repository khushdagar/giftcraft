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

Avoid oversized or distracting branding.

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

/** Sent right after the box photo (Image 1): turns the job into an edit of that box. */
export function boxEditLead(boxName: string, productCount: number, hasLogo = false): string {
  return `Image 1 above is the photo of the gift box selected for this pack: "${boxName}".

YOUR TASK IS TO EDIT IMAGE 1 — NOT TO DESIGN A NEW BOX.
Keep this exact box: the same shape, proportions, construction, lid, colour, finish and material as in Image 1.
Pack the ${productCount} product${productCount === 1 ? '' : 's'} shown in the following images inside the base of THIS box, nested in white shredded paper filler.
You may adjust the camera angle slightly and rest the lid beside or behind the base, but the box itself must remain recognisably identical to Image 1.
${
    hasLogo
      ? 'The client logo is supplied as the LAST image — print it on the lid in place of any "YOUR LOGO HERE" placeholder from Image 1, and on the products marked for branding in the BRANDING MAP (only those).'
      : 'Keep any artwork printed on the box exactly as shown in Image 1 (including a "YOUR LOGO HERE" placeholder). Do not add any other logo.'
  }

The products to pack follow:`;
}

/** Last instruction in the request — models weigh the final text heavily. */
export function boxFinalCheck(hasLogo = false, brandedProducts: string[] = []): string {
  return `FINAL CHECK BEFORE GENERATING:
• The ONLY box in the image is the box from Image 1 — same shape, proportions, construction and colour.
• No other box, tray, hamper, basket, bag or packaging of any kind.
• Every listed product sits inside that box, each exactly once. Nothing else is added — no extra notebooks, pens, stationery or props that only appeared in a product's reference photo.
• The lid rests on the surface beside the base or leans behind it. It never floats over, covers or cuts through the products.
• The box walls stay plain and solid exactly as in Image 1 — never merge a product into the box (no drawers, windows or compartments built into the box itself).
${
  hasLogo
    ? `• The client logo is printed on the top face of the lid, exactly as supplied, with the lid angled so it is clearly visible.${
        brandedProducts.length > 0
          ? ` It is ALSO applied to: ${brandedProducts.join(', ')} — each with its own branding method. No logo on any other product.`
          : ' No logo on any product.'
      }`
    : '• No new logo anywhere. The box keeps exactly the artwork shown in Image 1 — a "YOUR LOGO HERE" placeholder appears ONCE, only where it is in Image 1 (the lid top), with no extra lines of text added.'
}
• Never print the box name, the pack name or any other new text on the box. The box's product name is for your reference only.
• Keep each product's real colour and material (e.g. a wooden pen stand stays natural wood).`;
}

export interface PromptProduct {
  /** "Name (Brand)" */
  label: string;
  hasImage: boolean;
  /** Set only when the catalogue gives the product a branding method — it then gets the client logo. */
  branding?: { technique: string; position?: string | null } | null;
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
  products,
}: {
  boxName: string | null;
  boxDescription?: string | null;
  hasBoxImage: boolean;
  /** A client logo image is sent last — it goes on the box lid only. */
  hasLogo?: boolean;
  products: PromptProduct[];
}): string {
  let imageNo = 0;
  const refs: string[] = [];
  if (hasBoxImage) refs.push(`• Image ${++imageNo} — Gift box reference${boxName ? `: "${boxName}"` : ''}`);
  const productLines = products.map((p, i) => {
    const ref = p.hasImage ? `reference image ${++imageNo}` : 'no reference image — render a faithful real-world version from the name';
    if (p.hasImage) refs.push(`• Image ${imageNo} — Product: ${p.label}`);
    return `${i + 1}. ${p.label} (${ref})`;
  });

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
          '• The gift box lid — centred on the top face of the lid, as a clean premium print or foil stamp that follows the lid surface. It replaces any "YOUR LOGO HERE" placeholder shown on the box in Image 1.',
        ]
      : []),
    ...products
      .filter((p) => p.branding)
      .map(
        (p) =>
          `• ${p.label} — ${p.branding!.technique}${
            p.branding!.position ? `, position: ${p.branding!.position}` : ', in its most natural visible branding area'
          } (realistic ${p.branding!.technique.toLowerCase()} that follows the product surface, appropriately sized)`
      ),
  ];
  if (applyTo.length === 0) applyTo.push('• Nothing — no surface in this pack is marked for branding.');
  const skipLogo = products
    .filter((p) => !p.branding)
    .map((p) => `• ${p.label} — no logo; keep it exactly as in its reference`);
  if (skipLogo.length === 0) skipLogo.push('• Nothing else — no logo on the filler, background or any other surface.');

  const branding = logoImageNo
    ? `BRAND LOGO:
Use the uploaded client logo (Image ${logoImageNo}) exactly — do not redraw, recolour, distort or approximate it.

BRANDING MAP:

Apply the logo to:
${applyTo.join('\n')}

DO NOT apply the logo to:
${skipLogo.join('\n')}

Position the lid (for example leaning upright behind the base) so its top face and the logo are clearly visible to the camera.`
    : `BRAND LOGO:
No client logo supplied.

BRANDING MAP:
No custom branding. Do NOT add any new logo to the box or to any product.
Keep the artwork already printed on the box exactly as shown in the box reference (including any existing logo or "YOUR LOGO HERE" placeholder).
Preserve only the existing manufacturer branding visible in each product reference.`;

  // Catalogue box photos are studio shots (coloured backdrop, "YOUR LOGO HERE"
  // mock-ups) — without these rules the model recoloured the box to the
  // backdrop and swapped a top-bottom box for a hinged one.
  const box = hasBoxImage
    ? [
        `Use the uploaded gift-box reference (Image 1)${boxName ? ` — "${boxName}"` : ''}. This is the ONLY box allowed in the image.`,
        boxDescription ? `Box details: ${boxDescription}` : null,
        'Reproduce exactly the box construction shown in Image 1 (for example, a two-piece top-bottom box = a separate base plus a separate lid that lifts fully off). Do NOT turn it into a hinged, magnetic-flap, drawer, sleeve or any other box style.',
        'Show the base holding the products, with the removed lid resting beside or leaning behind it, as that construction allows.',
        hasLogo
          ? 'Image 1 is a studio photo: its background colour is NOT the box colour. Any "YOUR LOGO HERE" placeholder on the box is replaced by the client logo (see BRANDING MAP).'
          : 'Image 1 is a studio photo: its background colour is NOT the box colour. Keep any artwork printed on the box exactly as shown.',
      ]
        .filter(Boolean)
        .join('\n')
    : boxName
      ? `No box photo supplied — use a premium rigid gift box ("${boxName}") with a separate lid.`
      : 'No box reference supplied — use a premium rigid gift box with a separate lid.';

  const boxColour = hasBoxImage
    ? 'Exactly the colour and finish of the box itself in Image 1 — ignore the photo background. Never recolour the box to match the background.'
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
${boxColour}

${branding}

PRODUCTS:
Use ALL uploaded product references exactly.
This gift box contains exactly ${products.length} product${products.length === 1 ? '' : 's'} — each appears exactly once:
${productLines.join('\n')}

BACKGROUND:
Dark premium wine-red / burgundy studio background.

FRAMING (takes priority over the default composition where they differ):
Landscape 5:4 (near-square). Frame tightly so the PRODUCTS are the hero — the open box and its contents fill roughly 85–90% of the frame width, camera close and slightly elevated, minimal empty background.
Keep every product fully visible and uncropped; the lid may be partly cropped at the frame edge.

PRODUCT ARRANGEMENT:
Create the most premium and visually balanced arrangement possible
while keeping every supplied product recognizable and physically realistic.

NO ADDITIONAL PRODUCTS.
NO UNREQUESTED BRANDING.
NO UNREQUESTED PROPS.`;
}
