/* eslint-disable react-hooks/exhaustive-deps */
import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import { RandomGenerator } from "../helpers/RandomGenerator";
import cl from "./EmojiSelectModal.module.css";
import { InputForm } from "./InputForm";

interface IProps {
  initialValue: string;
  open: boolean;
  onClose: (emoji?: string) => void;
}

export function EmojiSelectModal({ initialValue, open, onClose }: IProps) {
  const [value, setValue] = useState(initialValue);
  const emojisList = useMemo(() => RandomGenerator.emojiList(), [open]);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (value.length < 1 || value.length > 2) return;
    onClose(value);
  };

  const handleModalClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={cl.modal} onClick={handleModalClick}>
      <div className={cl.content}>
        <p>Select an Emoji Key</p>

        <div className={cl.emojiList}>
          {emojisList.map((emoji, i) => (
            <span className={cl.emoji} key={i} onClick={() => onClose(emoji)}>
              {emoji}
            </span>
          ))}
        </div>

        <p>Or use your keyboard to type an emoji</p>
        <InputForm
          formClassName={cl.form}
          onSubmit={handleSubmit}
          className={cl.input}
          type="text"
          placeholder="Type an emoji"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={2}
          canSubmit={value.length > 0 && value.length <= 2}
        />
      </div>
    </div>
  );
}
