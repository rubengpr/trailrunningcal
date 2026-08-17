export const ANALYTICS_EVENTS = {
  BREADCRUMB_LINK_CLICKED: 'breadcrumb_link_clicked',
  CALENDAR_VIEW_MAP_CLICKED: 'calendar_view_map_clicked',
  DESKTOP_LAYOUT_CHANGED: 'desktop_layout_changed',
  ERROR_BOUNDARY_CAUGHT_ERROR: 'error_boundary_caught_error',
  ERROR_FALLBACK_RETRY_CLICKED: 'error_fallback_retry_clicked',
  EVENT_FAVORITE_CLICKED: 'event_favorite_clicked',
  EVENT_FEATURE_FEEDBACK_OPTION_TOGGLED: 'event_feature_feedback_option_toggled',
  EVENT_FEATURE_FEEDBACK_SUBMITTED: 'event_feature_feedback_submitted',
  EVENT_OFFICIAL_WEBSITE_CLICKED: 'event_official_website_clicked',
  EVENT_ORGANIZER_CLAIM_CLICKED: 'event_organizer_claim_clicked',
  EVENT_PROVINCE_LINK_CLICKED: 'event_province_link_clicked',
  EVENT_RACE_RESULTS_CLICKED: 'event_race_results_clicked',
  EVENT_RACE_MAP_OPENED: 'event_race_map_opened',
  EVENT_SHARE_CLICKED: 'event_share_clicked',
  EVENT_TRACK_MAP_FULLSCREEN_OPENED: 'event_track_map_fullscreen_opened',
  EVENT_TRACK_MAP_INTERACTED: 'event_track_map_interacted',
  EVENT_TRACK_MAP_DEEPLY_ENGAGED: 'event_track_map_deeply_engaged',
  EVENT_TRACK_MAP_TERRAIN_LOAD_FINISHED:
    'event_track_map_terrain_load_finished',
  EVENT_TRACK_MAP_TERRAIN_TOGGLED: 'event_track_map_terrain_toggled',
  EVENT_TRACK_MAP_PREVIEW_ENGAGED: 'event_track_map_preview_engaged',
  EVENT_TRACK_MAP_PREVIEW_EXPOSED: 'event_track_map_preview_exposed',
  EVENT_TRACK_MAP_VIEWED: 'event_track_map_viewed',
  FILTERS_APPLIED: 'filters_applied',
  MAP_VIEW_LIST_CLICKED: 'map_view_list_clicked',
  NAVBAR_FILTER_ICON_CLICKED: 'navbar_filter_icon_clicked',
  NAVBAR_LINK_CLICKED: 'navbar_link_clicked',
  RACE_FAVORITE_CLICKED: 'race_favorite_clicked',
  RACE_CARD_CLICKED: 'race_card_clicked',
  RACE_FILTERS_CLEARED: 'race_filters_cleared',
  RACE_ORGANIZER_CLAIM_CLICKED: 'race_organizer_claim_clicked',
  RACE_ORGANIZER_SOCIAL_CLICKED: 'race_organizer_social_clicked',
  RACE_OFFICIAL_WEBSITE_CLICKED: 'race_official_website_clicked',
  RACE_TIERS_OPENED: 'race_tiers_opened',
  RACE_CATEGORY_LINK_CLICKED: 'race_category_link_clicked',
  RACE_PROVINCE_INLINE_CLICKED: 'race_province_inline_clicked',
  RACE_PROVINCE_LINK_CLICKED: 'race_province_link_clicked',
  RACE_SHARE_CLICKED: 'race_share_clicked',
  SPONSOR_BANNER_CLICKED: 'sponsor_banner_clicked',
  SPONSOR_BANNER_IMPRESSION: 'sponsor_banner_impression',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

type MapExperimentProperties = {
  device_form_factor?: 'mobile' | 'desktop';
  feature_flag_variant?: 'control' | '3d_preview';
  requested_preview_mode?: '2d' | '3d';
};

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
    layout_toggle_variant: 'control' | 'icon_text';
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
  [ANALYTICS_EVENTS.EVENT_FEATURE_FEEDBACK_OPTION_TOGGLED]: {
    event_id: string;
    event_slug: string;
    feature: 'route_map' | 'photos' | 'services' | 'aid_stations' | 'schedule' | 'results' | 'reviews' | 'other';
    action: 'select' | 'remove';
    prompt_variant: 'control' | 'more_information';
  };
  [ANALYTICS_EVENTS.EVENT_FEATURE_FEEDBACK_SUBMITTED]: {
    event_id: string;
    event_slug: string;
    features: Array<'route_map' | 'photos' | 'services' | 'aid_stations' | 'schedule' | 'results' | 'reviews' | 'other'>;
    comment?: string;
    prompt_variant: 'control' | 'more_information';
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
  [ANALYTICS_EVENTS.EVENT_RACE_RESULTS_CLICKED]: {
    event_id: string;
    event_slug: string;
    race_id: string;
    distance_km: number;
  };
  [ANALYTICS_EVENTS.EVENT_RACE_MAP_OPENED]: {
    event_id: string;
    event_slug: string;
    provider: 'komoot' | 'wikiloc';
    race_id: string;
  };
  [ANALYTICS_EVENTS.EVENT_SHARE_CLICKED]: {
    event_id: string;
    event_slug: string;
  };
  [ANALYTICS_EVENTS.EVENT_TRACK_MAP_FULLSCREEN_OPENED]: {
    event_id: string;
    event_slug: string;
    route_count: number;
    race_count: number;
  } & MapExperimentProperties;
  [ANALYTICS_EVENTS.EVENT_TRACK_MAP_INTERACTED]: {
    event_id: string;
    event_slug: string;
    interaction: 'pan' | 'rotate' | 'zoom';
    route_count: number;
    race_count: number;
  } & MapExperimentProperties;
  [ANALYTICS_EVENTS.EVENT_TRACK_MAP_DEEPLY_ENGAGED]: {
    event_id: string;
    event_slug: string;
    device_form_factor: 'mobile' | 'desktop';
    feature_flag_variant: 'control' | '3d_preview';
    requested_preview_mode: '2d' | '3d';
    action_count: number;
    action_types: Array<'pan' | 'rotate' | 'zoom'>;
    active_map_time_ms: number;
    is_fullscreen: boolean;
    route_count: number;
    race_count: number;
  };
  [ANALYTICS_EVENTS.EVENT_TRACK_MAP_TERRAIN_LOAD_FINISHED]: {
    event_id: string;
    event_slug: string;
    outcome: 'ready' | 'cancelled' | 'timeout' | 'error';
    duration_ms: number;
  } & MapExperimentProperties;
  [ANALYTICS_EVENTS.EVENT_TRACK_MAP_TERRAIN_TOGGLED]: {
    event_id: string;
    event_slug: string;
    mode: '2d' | '3d';
  } & MapExperimentProperties;
  [ANALYTICS_EVENTS.EVENT_TRACK_MAP_PREVIEW_ENGAGED]: {
    event_id: string;
    event_slug: string;
    device_form_factor: 'mobile' | 'desktop';
    feature_flag_variant: 'control' | '3d_preview';
    requested_preview_mode: '2d' | '3d';
    engagement_type: 'open_map' | 'pan' | 'rotate' | 'zoom';
    route_count: number;
    race_count: number;
  };
  [ANALYTICS_EVENTS.EVENT_TRACK_MAP_PREVIEW_EXPOSED]: {
    event_id: string;
    event_slug: string;
    device_form_factor: 'mobile' | 'desktop';
    feature_flag_variant: 'control' | '3d_preview';
    requested_preview_mode: '2d' | '3d';
    route_count: number;
    race_count: number;
    terrain_status: '2d' | 'loading' | 'slow' | '3d' | 'failed';
  };
  [ANALYTICS_EVENTS.EVENT_TRACK_MAP_VIEWED]: {
    event_id: string;
    event_slug: string;
    route_count: number;
    race_count: number;
  } & MapExperimentProperties;
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
  [ANALYTICS_EVENTS.RACE_CARD_CLICKED]: {
    event_id: string;
    event_slug: string;
    source: 'calendar_explorer';
    /** 1-based rank of the card within its list. */
    list_position: number;
    /** Only resolved on the desktop explorer, where the layout toggle renders. */
    layout_toggle_variant?: 'control' | 'icon_text';
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
  [ANALYTICS_EVENTS.RACE_TIERS_OPENED]: {
    race_id: string;
    surface: 'desktop_popover' | 'mobile_modal';
    tier_count: number;
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
    brand: 'salssa' | 'otso' | 'asics';
    page: 'homepage' | 'event_page';
    banner_type: 'image_banner' | 'sticky_banner';
    locale: string;
    destination_url: string;
  };
  [ANALYTICS_EVENTS.SPONSOR_BANNER_IMPRESSION]: {
    brand: 'salssa' | 'otso' | 'asics';
    page: 'homepage' | 'event_page';
    banner_type: 'image_banner' | 'sticky_banner';
    locale: string;
    destination_url: string;
  };
}
