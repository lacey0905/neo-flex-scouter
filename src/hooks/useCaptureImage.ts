import { useRef, useCallback } from "react";
import { toBlob } from "html-to-image";

// 캡처 이미지 배경(페이지색)
const PAGE_BG = "#0f1117";

// .no-shot 으로 표시된 노드(버튼 등)는 이미지에서 제외
function filter(node: HTMLElement): boolean {
  return !(node.classList && node.classList.contains("no-shot"));
}

const canCopy =
  typeof navigator !== "undefined" &&
  !!navigator.clipboard &&
  typeof window !== "undefined" &&
  "ClipboardItem" in window;

export interface CaptureImage<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  copy: () => Promise<boolean>;
  canCopy: boolean;
}

/** 특정 DOM 영역을 PNG 이미지로 클립보드에 복사한다 (.no-shot 노드 제외). */
export function useCaptureImage<T extends HTMLElement>(): CaptureImage<T> {
  const ref = useRef<T>(null);

  const copy = useCallback(async () => {
    if (!ref.current || !canCopy) return false;
    try {
      const blob = await toBlob(ref.current, {
        pixelRatio: 2,
        backgroundColor: PAGE_BG,
        filter,
      });
      if (!blob) return false;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { ref, copy, canCopy };
}
