import clsx from "clsx";
import cl from "./Badge.module.css";

type BadgeColor = "grey" | "pink" | "green";

interface IProps {
  className?: string;
  color: BadgeColor;
  children: React.ReactNode;
}

export const Badge = ({ className, color, children }: IProps) => {
  return <div className={clsx(cl.badge, className, cl[color])}>{children}</div>;
};
