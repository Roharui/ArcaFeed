import { isNotNull } from "@/utils/type";
import type { Vault } from "@/vault";

function getCurrentSlide(v: Vault): HTMLElement {
  const { swiper } = v;
  const { slides, activeIndex } = isNotNull(swiper);

  return isNotNull(slides[activeIndex])
}

export { getCurrentSlide }
