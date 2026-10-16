// The committed gallery edit is the source of truth for every environment.
// Keep removed items available in the wider content model and on their direct
// project routes, but do not reintroduce them on the work index.
export const excludedWorkGalleryItemIdList = [
  'michael-food-test-sandwich',
  'michael-ad-interior',
  'michael-nanu-black-pot',
  'fellow',
  'michael-cradlewise-family',
  'michael-native-haircare-cupcakes',
  'michael-aw50519-court-bw',
  'miss-jones-pancake',
  'michael-molekule-bath',
  'michael-aw51026-court-portrait',
  'michael-aw59536-group',
  'michael-aw59665-double-exposure',
  'michael-native-stop-motion-still',
] as const;

export const excludedWorkGalleryItemIds: ReadonlySet<string> = new Set(
  excludedWorkGalleryItemIdList,
);
