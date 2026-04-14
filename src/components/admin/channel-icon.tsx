import { MessageCircle, Smartphone, Instagram, Facebook } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ConversationChannel, CHANNEL_CONFIG } from '@/lib/constants';

const ICON_MAP = {
  MessageCircle,
  Smartphone,
  Instagram,
  Facebook,
} as const;

export function ChannelIcon({
  channel,
  size = 16,
  className,
}: {
  channel: ConversationChannel;
  size?: number;
  className?: string;
}) {
  const config = CHANNEL_CONFIG[channel];
  const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP];

  return <Icon className={cn(config.color, className)} style={{ width: size, height: size }} />;
}
