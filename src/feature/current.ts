import { checkNotNull } from "@/utils";

import type { Vault } from "@/vault";

function getCurrentSlide(v: Vault): HTMLElement {
  const { swiper } = v;
  const { slides, activeIndex } = checkNotNull(swiper);

  return checkNotNull(slides[activeIndex])
}

export { getCurrentSlide }
