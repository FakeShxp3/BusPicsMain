export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type VehicleStatus =
  | "active"
  | "retired"
  | "scrapped"
  | "transferred"
  | "unknown";

export type PhotoMimeType = "image/jpeg" | "image/png" | "image/webp";

export type ThemePreference = "light" | "dark" | "system";
export type DateStyle = "medium" | "short" | "iso" | "long";
export type TimeFormat = "12h" | "24h";
export type Units = "metric" | "imperial";
export type VehicleView = "table" | "grid";
export type SightingView = "list" | "gallery";
export type GalleryDensity = "compact" | "comfortable" | "spacious";

export type Database = {
  transitspotter: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          theme: ThemePreference;
          date_style: DateStyle;
          time_format: TimeFormat;
          units: Units;
          default_vehicle_view: VehicleView;
          default_sighting_view: SightingView;
          gallery_density: GalleryDensity;
          map_center_lat: number | null;
          map_center_lng: number | null;
          map_zoom: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: ThemePreference;
          date_style?: DateStyle;
          time_format?: TimeFormat;
          units?: Units;
          default_vehicle_view?: VehicleView;
          default_sighting_view?: SightingView;
          gallery_density?: GalleryDensity;
          map_center_lat?: number | null;
          map_center_lng?: number | null;
          map_zoom?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          theme?: ThemePreference;
          date_style?: DateStyle;
          time_format?: TimeFormat;
          units?: Units;
          default_vehicle_view?: VehicleView;
          default_sighting_view?: SightingView;
          gallery_density?: GalleryDensity;
          map_center_lat?: number | null;
          map_center_lng?: number | null;
          map_zoom?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      operators: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          abbreviation: string | null;
          region: string | null;
          ownership_type: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          abbreviation?: string | null;
          region?: string | null;
          ownership_type?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          abbreviation?: string | null;
          region?: string | null;
          ownership_type?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          operator_id: string | null;
          fleet_number: string | null;
          manufacturer: string | null;
          model: string | null;
          generation: string | null;
          vehicle_category: string | null;
          powertrain: string | null;
          length_m: number | null;
          model_year: number | null;
          in_service_year: number | null;
          status: VehicleStatus;
          status_verified_on: string | null;
          notes: string | null;
          cover_photo_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          operator_id?: string | null;
          fleet_number?: string | null;
          manufacturer?: string | null;
          model?: string | null;
          generation?: string | null;
          vehicle_category?: string | null;
          powertrain?: string | null;
          length_m?: number | null;
          model_year?: number | null;
          in_service_year?: number | null;
          status?: VehicleStatus;
          status_verified_on?: string | null;
          notes?: string | null;
          cover_photo_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          operator_id?: string | null;
          fleet_number?: string | null;
          manufacturer?: string | null;
          model?: string | null;
          generation?: string | null;
          vehicle_category?: string | null;
          powertrain?: string | null;
          length_m?: number | null;
          model_year?: number | null;
          in_service_year?: number | null;
          status?: VehicleStatus;
          status_verified_on?: string | null;
          notes?: string | null;
          cover_photo_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sightings: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string;
          spotted_at: string;
          route: string | null;
          direction: string | null;
          location_name: string | null;
          latitude: number | null;
          longitude: number | null;
          camera_model: string | null;
          lens: string | null;
          aperture: string | null;
          shutter_speed: string | null;
          iso: number | null;
          focal_length: string | null;
          weather: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_id: string;
          spotted_at?: string;
          route?: string | null;
          direction?: string | null;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          camera_model?: string | null;
          lens?: string | null;
          aperture?: string | null;
          shutter_speed?: string | null;
          iso?: number | null;
          focal_length?: string | null;
          weather?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vehicle_id?: string;
          spotted_at?: string;
          route?: string | null;
          direction?: string | null;
          location_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          camera_model?: string | null;
          lens?: string | null;
          aperture?: string | null;
          shutter_speed?: string | null;
          iso?: number | null;
          focal_length?: string | null;
          weather?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          user_id: string;
          sighting_id: string;
          storage_path: string;
          original_filename: string;
          mime_type: PhotoMimeType;
          file_size: number | null;
          width: number | null;
          height: number | null;
          caption: string | null;
          alt_text: string | null;
          sort_order: number;
          is_cover: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sighting_id: string;
          storage_path: string;
          original_filename: string;
          mime_type: PhotoMimeType;
          file_size?: number | null;
          width?: number | null;
          height?: number | null;
          caption?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          is_cover?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sighting_id?: string;
          storage_path?: string;
          original_filename?: string;
          mime_type?: PhotoMimeType;
          file_size?: number | null;
          width?: number | null;
          height?: number | null;
          caption?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          is_cover?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicle_status_history: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string;
          previous_status: VehicleStatus | null;
          new_status: VehicleStatus;
          changed_on: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_id: string;
          previous_status?: VehicleStatus | null;
          new_status: VehicleStatus;
          changed_on?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vehicle_id?: string;
          previous_status?: VehicleStatus | null;
          new_status?: VehicleStatus;
          changed_on?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      vehicle_overview: {
        Row: {
          id: string;
          user_id: string;
          operator_id: string | null;
          operator_name: string | null;
          operator_abbreviation: string | null;
          fleet_number: string | null;
          manufacturer: string | null;
          model: string | null;
          generation: string | null;
          vehicle_category: string | null;
          powertrain: string | null;
          length_m: number | null;
          model_year: number | null;
          in_service_year: number | null;
          status: VehicleStatus;
          status_verified_on: string | null;
          notes: string | null;
          cover_photo_id: string | null;
          cover_storage_path: string | null;
          created_at: string;
          updated_at: string;
          sighting_count: number;
          photo_count: number;
          first_spotted_at: string | null;
          last_spotted_at: string | null;
          routes: string[];
        };
        Relationships: [];
      };
      sighting_overview: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string;
          spotted_at: string;
          route: string | null;
          direction: string | null;
          location_name: string | null;
          latitude: number | null;
          longitude: number | null;
          camera_model: string | null;
          lens: string | null;
          aperture: string | null;
          shutter_speed: string | null;
          iso: number | null;
          focal_length: string | null;
          weather: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          fleet_number: string | null;
          manufacturer: string | null;
          model: string | null;
          generation: string | null;
          vehicle_category: string | null;
          powertrain: string | null;
          vehicle_status: VehicleStatus;
          operator_id: string | null;
          operator_name: string | null;
          operator_abbreviation: string | null;
          photo_count: number;
          cover_photo_id: string | null;
          cover_storage_path: string | null;
        };
        Relationships: [];
      };
      photo_overview: {
        Row: {
          id: string;
          user_id: string;
          sighting_id: string;
          storage_path: string;
          original_filename: string;
          mime_type: PhotoMimeType;
          file_size: number | null;
          width: number | null;
          height: number | null;
          caption: string | null;
          alt_text: string | null;
          sort_order: number;
          is_cover: boolean;
          created_at: string;
          spotted_at: string;
          route: string | null;
          direction: string | null;
          location_name: string | null;
          latitude: number | null;
          longitude: number | null;
          vehicle_id: string;
          fleet_number: string | null;
          manufacturer: string | null;
          model: string | null;
          generation: string | null;
          vehicle_category: string | null;
          powertrain: string | null;
          operator_id: string | null;
          operator_name: string | null;
          operator_abbreviation: string | null;
        };
        Relationships: [];
      };
      operator_overview: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          abbreviation: string | null;
          region: string | null;
          ownership_type: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          vehicle_count: number;
          sighting_count: number;
          photo_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      record_vehicle_status: {
        Args: {
          p_vehicle_id: string;
          p_status: VehicleStatus;
          p_changed_on?: string;
          p_notes?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = Database["transitspotter"]["Tables"]["profiles"]["Row"];
export type UserPreferences = Database["transitspotter"]["Tables"]["user_preferences"]["Row"];
export type Operator = Database["transitspotter"]["Tables"]["operators"]["Row"];
export type Vehicle = Database["transitspotter"]["Tables"]["vehicles"]["Row"];
export type Sighting = Database["transitspotter"]["Tables"]["sightings"]["Row"];
export type Photo = Database["transitspotter"]["Tables"]["photos"]["Row"];
export type StatusHistoryEntry =
  Database["transitspotter"]["Tables"]["vehicle_status_history"]["Row"];
export type VehicleOverview = Database["transitspotter"]["Views"]["vehicle_overview"]["Row"];
export type SightingOverview = Database["transitspotter"]["Views"]["sighting_overview"]["Row"];
export type PhotoOverview = Database["transitspotter"]["Views"]["photo_overview"]["Row"];
export type OperatorOverview = Database["transitspotter"]["Views"]["operator_overview"]["Row"];
