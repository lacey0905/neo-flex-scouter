import { useState } from "react";
import "./CaptureButton.scss";

interface CaptureButtonProps {
  copy: () => Promise<boolean>;
  canCopy: boolean;
}

/** 부모 영역을 이미지로 클립보드에 복사하는 버튼 (.no-shot: 캡처에서 제외). */
export function CaptureButton({ copy, canCopy }: CaptureButtonProps) {
  const [copied, setCopied] = useState(false);

  if (!canCopy) return null;

  const handleCopy = async () => {
    const ok = await copy();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="capture no-shot">
      <button className="capture__btn" onClick={handleCopy} title="이미지 복사">
        {copied ? "복사됨" : "이미지 복사"}
      </button>
    </div>
  );
}
