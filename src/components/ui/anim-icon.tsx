"use client";

import { useRef } from "react";

import { useAnimIcon } from "./use-anim-icon";

import {
  AlertCircleIcon,
  BellRingIcon,
  BookOpen01Icon,
  Calendar01Icon,
  Cancel01Icon,
  ChartLineIcon,
  CheckListIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  CookieIcon,
  CreditCardIcon,
  Delete02Icon,
  DeliveryBox01Icon,
  DeliveryTruck01Icon,
  DiscountTag01Icon,
  Edit02Icon,
  EyeIcon,
  Flag01Icon,
  FireIcon,
  GiftIcon,
  HeartIcon,
  Home01Icon,
  Image01Icon,
  InformationCircleIcon,
  Link01Icon,
  LockKeyholeIcon,
  Location01Icon,
  Mail01Icon,
  Megaphone01Icon,
  MoneyBag01Icon,
  Moon01Icon,
  Notebook01Icon,
  PackageDeliveredIcon,
  PaintBrush01Icon,
  PhoneIcon,
  ReceiptIcon,
  Rocket01Icon,
  SearchIcon,
  ShoppingBag01Icon,
  SparklesIcon,
  StarIcon,
  Sun01Icon,
  Target01Icon,
  ThumbsUpIcon,
  UserIcon,
  WhatsappIcon,
} from "@animateicons/react/huge";

type IconComponent = React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof CookieIcon> & React.RefAttributes<unknown>
>;

/**
 * name -> AnimateIcon. Server components pass a string `name` across the RSC
 * boundary (passing a component reference would throw). The wrapper attaches
 * its own ref and drives start/stop on hover, so callers just write
 * `<AnimIcon name="cake" className="h-16 w-16" />`.
 */
const ICONS: Record<string, IconComponent> = {
  alert: AlertCircleIcon,
  bell: BellRingIcon,
  book: BookOpen01Icon,
  calendar: Calendar01Icon,
  cancel: Cancel01Icon,
  cake: CookieIcon,
  card: CreditCardIcon,
  cart: ShoppingBag01Icon,
  chart: ChartLineIcon,
  check: CheckmarkCircle01Icon,
  checklist: CheckListIcon,
  clock: Clock01Icon,
  cookie: CookieIcon,
  delivery: DeliveryTruck01Icon,
  box: DeliveryBox01Icon,
  edit: Edit02Icon,
  flag: Flag01Icon,
  fire: FireIcon,
  gift: GiftIcon,
  heart: HeartIcon,
  home: Home01Icon,
  image: Image01Icon,
  info: InformationCircleIcon,
  link: Link01Icon,
  lock: LockKeyholeIcon,
  mail: Mail01Icon,
  megaphone: Megaphone01Icon,
  money: MoneyBag01Icon,
  moon: Moon01Icon,
  note: Notebook01Icon,
  package: PackageDeliveredIcon,
  paint: PaintBrush01Icon,
  phone: PhoneIcon,
  receipt: ReceiptIcon,
  rocket: Rocket01Icon,
  search: SearchIcon,
  sparkles: SparklesIcon,
  star: StarIcon,
  sun: Sun01Icon,
  tag: DiscountTag01Icon,
  target: Target01Icon,
  thumb: ThumbsUpIcon,
  trash: Delete02Icon,
  user: UserIcon,
  whatsapp: WhatsappIcon,
} as Record<string, IconComponent>;

interface AnimIconProps {
  name: string;
  size?: number;
  className?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}

export function AnimIcon({
  name,
  size,
  className,
  onMouseEnter,
  onMouseLeave,
  ...props
}: AnimIconProps & Omit<React.ComponentPropsWithoutRef<typeof CookieIcon>, "size" | "className">) {
  const ref = useAnimIcon();
  const Icon = ICONS[name];
  if (!Icon) return null;

  return (
    <Icon
      ref={ref}
      size={size}
      className={className}
      onMouseEnter={(e) => {
        ref.current?.startAnimation();
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        ref.current?.stopAnimation();
        onMouseLeave?.(e);
      }}
      {...props}
    />
  );
}
