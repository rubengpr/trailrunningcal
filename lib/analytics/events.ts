export const ANALYTICS_EVENTS = {
  BREADCRUMB_LINK_CLICKED: 'breadcrumb_link_clicked',
  CALENDAR_VIEW_MAP_CLICKED: 'calendar_view_map_clicked',
  DESKTOP_LAYOUT_CHANGED: 'desktop_layout_changed',
  ERROR_BOUNDARY_CAUGHT_ERROR: 'error_boundary_caught_error',
  ERROR_FALLBACK_RETRY_CLICKED: 'error_fallback_retry_clicked',
  EVENT_FAVORITE_CLICKED: 'event_favorite_clicked',
  EVENT_OFFICIAL_WEBSITE_CLICKED: 'event_official_website_clicked',
  EVENT_ORGANIZER_CLAIM_CLICKED: 'event_organizer_claim_clicked',
  EVENT_PROVINCE_LINK_CLICKED: 'event_province_link_clicked',
  EVENT_SHARE_CLICKED: 'event_share_clicked',
  FILTERS_APPLIED: 'filters_applied',
  MAP_VIEW_LIST_CLICKED: 'map_view_list_clicked',
  NAVBAR_FILTER_ICON_CLICKED: 'navbar_filter_icon_clicked',
  NAVBAR_LINK_CLICKED: 'navbar_link_clicked',
  RACE_FAVORITE_CLICKED: 'race_favorite_clicked',
  RACE_FILTERS_CLEARED: 'race_filters_cleared',
  RACE_ORGANIZER_CLAIM_CLICKED: 'race_organizer_claim_clicked',
  RACE_ORGANIZER_SOCIAL_CLICKED: 'race_organizer_social_clicked',
  RACE_OFFICIAL_WEBSITE_CLICKED: 'race_official_website_clicked',
  RACE_CATEGORY_LINK_CLICKED: 'race_category_link_clicked',
  RACE_PROVINCE_INLINE_CLICKED: 'race_province_inline_clicked',
  RACE_PROVINCE_LINK_CLICKED: 'race_province_link_clicked',
  RACE_SHARE_CLICKED: 'race_share_clicked',
  SPONSOR_BANNER_CLICKED: 'sponsor_banner_clicked',
  SPONSOR_BANNER_IMPRESSION: 'sponsor_banner_impression',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export interface AnalyticsEventProperties {
  [ANALYTICS_EVENTS.BREADCRUMB_LINK_CLICKED]: {
    link_name: string;
    href: string;
  } & Record<string, unknown>;
  [ANALYTICS_EVENTS.CALENDAR_VIEW_MAP_CLICKED]: {
    locale: string;
  };
  [ANALYTICS_EVENTS.DESKTOP_LAYOUT_CHANGED]: {
    layout: 'list' | 'both' | 'map';
    button: 'list' | 'map';
  };
  [ANALYTICS_EVENTS.ERROR_BOUNDARY_CAUGHT_ERROR]: {
    error_message: string;
    error_stack?: string;
    component_stack?: string | null;
  };
  [ANALYTICS_EVENTS.ERROR_FALLBACK_RETRY_CLICKED]: {
    error_message?: string;
  };
  [ANALYTICS_EVENTS.EVENT_FAVORITE_CLICKED]: {
    event_id: string;
    event_slug: string;
    action: 'save' | 'remove';
  };
  [ANALYTICS_EVENTS.EVENT_OFFICIAL_WEBSITE_CLICKED]: {
    event_id: string;
    event_slug: string;
  };
  [ANALYTICS_EVENTS.EVENT_ORGANIZER_CLAIM_CLICKED]: {
    event_name: string;
  };
  [ANALYTICS_EVENTS.EVENT_PROVINCE_LINK_CLICKED]: {
    event_id: string;
    event_slug: string;
    province: string;
  };
  [ANALYTICS_EVENTS.EVENT_SHARE_CLICKED]: {
    event_id: string;
    event_slug: string;
  };
  [ANALYTICS_EVENTS.FILTERS_APPLIED]: {
    variant:
      | 'control'
      | 'control-black'
      | 'sticky-button-white'
      | 'sticky-button-black'
      | 'pill-white'
      | 'pill-black';
    filter_type: 'month' | 'province' | 'distance' | 'race_type' | 'apply';
  };
  [ANALYTICS_EVENTS.MAP_VIEW_LIST_CLICKED]: {
    locale: string;
  };
  [ANALYTICS_EVENTS.NAVBAR_FILTER_ICON_CLICKED]: {
    filter_count: number;
    variant: string | boolean | undefined;
  };
  [ANALYTICS_EVENTS.NAVBAR_LINK_CLICKED]: {
    link_text: string;
    link_href: string;
    locale: string;
  };
  [ANALYTICS_EVENTS.RACE_FAVORITE_CLICKED]: {
    race_id: string;
    action: 'save' | 'remove';
  };
  [ANALYTICS_EVENTS.RACE_FILTERS_CLEARED]: undefined;
  [ANALYTICS_EVENTS.RACE_ORGANIZER_CLAIM_CLICKED]: {
    race_name: string;
  };
  [ANALYTICS_EVENTS.RACE_ORGANIZER_SOCIAL_CLICKED]: {
    platform: 'facebook' | 'instagram' | 'youtube' | 'tiktok';
    organizer_name?: string;
    race_id?: string;
    race_slug?: string;
  };
  [ANALYTICS_EVENTS.RACE_OFFICIAL_WEBSITE_CLICKED]: {
    race_id: string;
    race_slug: string;
  };
  [ANALYTICS_EVENTS.RACE_CATEGORY_LINK_CLICKED]: {
    race_id: string;
    race_slug: string;
    category: string;
  };
  [ANALYTICS_EVENTS.RACE_PROVINCE_INLINE_CLICKED]: {
    race_id: string;
    race_slug: string;
    province: string;
  };
  [ANALYTICS_EVENTS.RACE_PROVINCE_LINK_CLICKED]: {
    race_id: string;
    race_slug: string;
  };
  [ANALYTICS_EVENTS.RACE_SHARE_CLICKED]: {
    race_id?: string;
    race_slug?: string;
  };
  [ANALYTICS_EVENTS.SPONSOR_BANNER_CLICKED]: {
    brand: 'salssa' | 'otso';
    page: 'homepage' | 'event_page';
    banner_type: 'image_banner' | 'sticky_banner';
    locale: string;
    destination_url: string;
  };
  [ANALYTICS_EVENTS.SPONSOR_BANNER_IMPRESSION]: {
    brand: 'salssa' | 'otso';
    page: 'homepage' | 'event_page';
    banner_type: 'image_banner' | 'sticky_banner';
    locale: string;
    destination_url: string;
  };
}
