export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: []
      }
      api_request_log: {
        Row: {
          api_key_id: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          ip: string | null
          method: string
          path: string
          status: number
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          ip?: string | null
          method: string
          path: string
          status?: number
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          ip?: string | null
          method?: string
          path?: string
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_request_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          phone_e164: string
          provider: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          phone_e164: string
          provider: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          phone_e164?: string
          provider?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      call_participants: {
        Row: {
          call_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          state: string
          user_id: string
        }
        Insert: {
          call_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          state?: string
          user_id: string
        }
        Update: {
          call_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          answered_at: string | null
          conversation_id: string | null
          duration_seconds: number
          ended_at: string | null
          external_number: string | null
          id: string
          initiator_id: string | null
          kind: string
          metadata: Json
          provider: string | null
          provider_call_id: string | null
          recording_url: string | null
          scope: string
          started_at: string
          status: string
        }
        Insert: {
          answered_at?: string | null
          conversation_id?: string | null
          duration_seconds?: number
          ended_at?: string | null
          external_number?: string | null
          id?: string
          initiator_id?: string | null
          kind?: string
          metadata?: Json
          provider?: string | null
          provider_call_id?: string | null
          recording_url?: string | null
          scope?: string
          started_at?: string
          status?: string
        }
        Update: {
          answered_at?: string | null
          conversation_id?: string | null
          duration_seconds?: number
          ended_at?: string | null
          external_number?: string | null
          id?: string
          initiator_id?: string | null
          kind?: string
          metadata?: Json
          provider?: string | null
          provider_call_id?: string | null
          recording_url?: string | null
          scope?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          external_ids: Json
          full_name: string
          id: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          source: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          external_ids?: Json
          full_name?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          external_ids?: Json
          full_name?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          member_role: string
          muted: boolean
          pinned: boolean
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          member_role?: string
          muted?: boolean
          pinned?: boolean
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          member_role?: string
          muted?: boolean
          pinned?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_initials: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          last_message_at: string
          last_message_preview: string
          name: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          avatar_initials?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_message_at?: string
          last_message_preview?: string
          name?: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          avatar_initials?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_message_at?: string
          last_message_preview?: string
          name?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_events: {
        Row: {
          created_at: string
          direction: string
          error: string | null
          event_type: string
          id: string
          integration_id: string | null
          payload: Json
          provider: string
          response: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          direction?: string
          error?: string | null
          event_type?: string
          id?: string
          integration_id?: string | null
          payload?: Json
          provider: string
          response?: Json | null
          status?: string
        }
        Update: {
          created_at?: string
          direction?: string
          error?: string | null
          event_type?: string
          id?: string
          integration_id?: string | null
          payload?: Json
          provider?: string
          response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          auth_type: string
          base_url: string | null
          category: string
          config: Json
          created_at: string
          created_by: string | null
          direction: string
          enabled: boolean
          errors_24h: number
          events_24h: number
          id: string
          last_error: string | null
          last_sync_at: string | null
          name: string
          provider: string
          secret_name: string | null
          status: string
          updated_at: string
          webhook_token: string | null
        }
        Insert: {
          auth_type?: string
          base_url?: string | null
          category?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          direction?: string
          enabled?: boolean
          errors_24h?: number
          events_24h?: number
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          name: string
          provider: string
          secret_name?: string | null
          status?: string
          updated_at?: string
          webhook_token?: string | null
        }
        Update: {
          auth_type?: string
          base_url?: string | null
          category?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          direction?: string
          enabled?: boolean
          errors_24h?: number
          events_24h?: number
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          name?: string
          provider?: string
          secret_name?: string | null
          status?: string
          updated_at?: string
          webhook_token?: string | null
        }
        Relationships: []
      }
      journey_touches: {
        Row: {
          call_id: string | null
          created_at: string
          direction: string | null
          id: string
          journey_id: string
          occurred_at: string
          provider: string
          talk_seconds: number
        }
        Insert: {
          call_id?: string | null
          created_at?: string
          direction?: string | null
          id?: string
          journey_id: string
          occurred_at?: string
          provider: string
          talk_seconds?: number
        }
        Update: {
          call_id?: string | null
          created_at?: string
          direction?: string | null
          id?: string
          journey_id?: string
          occurred_at?: string
          provider?: string
          talk_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "journey_touches_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "telephony_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_touches_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "lead_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_journeys: {
        Row: {
          attributed_provider: string | null
          callback_via_calltools: boolean
          contact_id: string | null
          created_at: string
          days_to_contact: number | null
          first_touch_at: string | null
          first_touch_provider: string | null
          id: string
          inbound_callgrid_count: number
          last_touch_at: string | null
          last_touch_provider: string | null
          outbound_calltools_count: number
          owner_id: string | null
          phone_e164: string
          total_attempts: number
          total_talk_seconds: number
          updated_at: string
        }
        Insert: {
          attributed_provider?: string | null
          callback_via_calltools?: boolean
          contact_id?: string | null
          created_at?: string
          days_to_contact?: number | null
          first_touch_at?: string | null
          first_touch_provider?: string | null
          id?: string
          inbound_callgrid_count?: number
          last_touch_at?: string | null
          last_touch_provider?: string | null
          outbound_calltools_count?: number
          owner_id?: string | null
          phone_e164: string
          total_attempts?: number
          total_talk_seconds?: number
          updated_at?: string
        }
        Update: {
          attributed_provider?: string | null
          callback_via_calltools?: boolean
          contact_id?: string | null
          created_at?: string
          days_to_contact?: number | null
          first_touch_at?: string | null
          first_touch_provider?: string | null
          id?: string
          inbound_callgrid_count?: number
          last_touch_at?: string | null
          last_touch_provider?: string | null
          outbound_calltools_count?: number
          owner_id?: string | null
          phone_e164?: string
          total_attempts?: number
          total_talk_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_journeys_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          body: string
          call_direction: string | null
          call_duration: string | null
          call_missed: boolean | null
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          kind: string
          sender_id: string | null
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body?: string
          call_direction?: string | null
          call_duration?: string | null
          call_missed?: boolean | null
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          kind?: string
          sender_id?: string | null
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          body?: string
          call_direction?: string | null
          call_duration?: string | null
          call_missed?: boolean | null
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          kind?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_webhooks: {
        Row: {
          created_at: string
          created_by: string | null
          event: string
          failures: number
          id: string
          last_fired_at: string | null
          secret_name: string | null
          status: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event: string
          failures?: number
          id?: string
          last_fired_at?: string | null
          secret_name?: string | null
          status?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event?: string
          failures?: number
          id?: string
          last_fired_at?: string | null
          secret_name?: string | null
          status?: string
          url?: string
        }
        Relationships: []
      }
      post_attachments: {
        Row: {
          created_at: string
          id: string
          mime: string | null
          name: string
          path: string
          post_id: string
          size: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mime?: string | null
          name: string
          path: string
          post_id: string
          size?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mime?: string | null
          name?: string
          path?: string
          post_id?: string
          size?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          audience: string
          author_id: string | null
          body: string
          channel: string
          created_at: string
          id: string
          kind: string
          pinned: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          audience?: string
          author_id?: string | null
          body?: string
          channel?: string
          created_at?: string
          id?: string
          kind?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string
          author_id?: string | null
          body?: string
          channel?: string
          created_at?: string
          id?: string
          kind?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_initials: string
          avatar_url: string | null
          created_at: string
          department: string
          email: string
          id: string
          landing: string
          name: string
          phone: string | null
          presence: string
          team: string
          title: string
          updated_at: string
        }
        Insert: {
          avatar_initials?: string
          avatar_url?: string | null
          created_at?: string
          department?: string
          email?: string
          id: string
          landing?: string
          name?: string
          phone?: string | null
          presence?: string
          team?: string
          title?: string
          updated_at?: string
        }
        Update: {
          avatar_initials?: string
          avatar_url?: string | null
          created_at?: string
          department?: string
          email?: string
          id?: string
          landing?: string
          name?: string
          phone?: string | null
          presence?: string
          team?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shift_sessions: {
        Row: {
          auto_closed: boolean
          available_seconds: number
          break_count: number
          break_overrun_seconds: number
          break_seconds: number
          created_at: string
          current_status: string
          current_status_at: string
          id: string
          lunch_count: number
          lunch_overrun_seconds: number
          lunch_seconds: number
          meeting_seconds: number
          on_call_seconds: number
          signed_in_at: string
          signed_out_at: string | null
          training_seconds: number
          unavailable_seconds: number
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          auto_closed?: boolean
          available_seconds?: number
          break_count?: number
          break_overrun_seconds?: number
          break_seconds?: number
          created_at?: string
          current_status?: string
          current_status_at?: string
          id?: string
          lunch_count?: number
          lunch_overrun_seconds?: number
          lunch_seconds?: number
          meeting_seconds?: number
          on_call_seconds?: number
          signed_in_at?: string
          signed_out_at?: string | null
          training_seconds?: number
          unavailable_seconds?: number
          updated_at?: string
          user_id: string
          work_date?: string
        }
        Update: {
          auto_closed?: boolean
          available_seconds?: number
          break_count?: number
          break_overrun_seconds?: number
          break_seconds?: number
          created_at?: string
          current_status?: string
          current_status_at?: string
          id?: string
          lunch_count?: number
          lunch_overrun_seconds?: number
          lunch_seconds?: number
          meeting_seconds?: number
          on_call_seconds?: number
          signed_in_at?: string
          signed_out_at?: string | null
          training_seconds?: number
          unavailable_seconds?: number
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: []
      }
      shift_status_events: {
        Row: {
          allowance_seconds: number | null
          created_at: string
          detail: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          overrun_seconds: number
          session_id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          allowance_seconds?: number | null
          created_at?: string
          detail?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          overrun_seconds?: number
          session_id: string
          started_at?: string
          status: string
          user_id: string
        }
        Update: {
          allowance_seconds?: number | null
          created_at?: string
          detail?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          overrun_seconds?: number
          session_id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_status_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "shift_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          body: string
          created_at: string
          direction: string
          error: string | null
          id: string
          media_path: string | null
          provider: string | null
          provider_message_id: string | null
          sent_by: string | null
          status: string
          thread_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          media_path?: string | null
          provider?: string | null
          provider_message_id?: string | null
          sent_by?: string | null
          status?: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          media_path?: string | null
          provider?: string | null
          provider_message_id?: string | null
          sent_by?: string | null
          status?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "sms_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_threads: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          from_number: string | null
          id: string
          last_message_at: string
          last_message_preview: string
          provider: string | null
          status: string
          unread_count: number
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          contact_name?: string
          contact_phone: string
          created_at?: string
          from_number?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string
          provider?: string | null
          status?: string
          unread_count?: number
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          from_number?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string
          provider?: string | null
          status?: string
          unread_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sms_threads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_state: {
        Row: {
          created_at: string
          cursor: string | null
          id: string
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          provider: string
          records_last_run: number
          records_total: number
          resource: string
          updated_at: string
          watermark: string | null
        }
        Insert: {
          created_at?: string
          cursor?: string | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          provider: string
          records_last_run?: number
          records_total?: number
          resource: string
          updated_at?: string
          watermark?: string | null
        }
        Update: {
          created_at?: string
          cursor?: string | null
          id?: string
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          provider?: string
          records_last_run?: number
          records_total?: number
          resource?: string
          updated_at?: string
          watermark?: string | null
        }
        Relationships: []
      }
      telephony_agents: {
        Row: {
          active: boolean
          created_at: string
          id: string
          provider: string
          provider_agent_email: string | null
          provider_agent_id: string
          provider_agent_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          provider: string
          provider_agent_email?: string | null
          provider_agent_id: string
          provider_agent_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          provider?: string
          provider_agent_email?: string | null
          provider_agent_id?: string
          provider_agent_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      telephony_calls: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          agent_user_id: string | null
          buyer: string | null
          campaign: string | null
          created_at: string
          direction: string | null
          disposition: string | null
          ended_at: string | null
          from_number: string | null
          id: string
          journey_id: string | null
          lead_phone_e164: string | null
          payout: number | null
          provider: string
          provider_call_id: string
          publisher: string | null
          raw: Json
          recording_url: string | null
          revenue: number | null
          started_at: string | null
          state_code: string | null
          status: string | null
          synced_at: string
          talk_seconds: number
          to_number: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          agent_user_id?: string | null
          buyer?: string | null
          campaign?: string | null
          created_at?: string
          direction?: string | null
          disposition?: string | null
          ended_at?: string | null
          from_number?: string | null
          id?: string
          journey_id?: string | null
          lead_phone_e164?: string | null
          payout?: number | null
          provider: string
          provider_call_id: string
          publisher?: string | null
          raw?: Json
          recording_url?: string | null
          revenue?: number | null
          started_at?: string | null
          state_code?: string | null
          status?: string | null
          synced_at?: string
          talk_seconds?: number
          to_number?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          agent_user_id?: string | null
          buyer?: string | null
          campaign?: string | null
          created_at?: string
          direction?: string | null
          disposition?: string | null
          ended_at?: string | null
          from_number?: string | null
          id?: string
          journey_id?: string | null
          lead_phone_e164?: string | null
          payout?: number | null
          provider?: string
          provider_call_id?: string
          publisher?: string | null
          raw?: Json
          recording_url?: string | null
          revenue?: number | null
          started_at?: string | null
          state_code?: string | null
          status?: string | null
          synced_at?: string
          talk_seconds?: number
          to_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telephony_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "telephony_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telephony_calls_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "lead_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_call_participant: {
        Args: { _call_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_ops: { Args: { _user_id: string }; Returns: boolean }
      shift_close_stale_sessions: {
        Args: { _max_hours?: number }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "CEO"
        | "Administrator"
        | "Operations"
        | "HR"
        | "Accounting"
        | "QC"
        | "Agent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "CEO",
        "Administrator",
        "Operations",
        "HR",
        "Accounting",
        "QC",
        "Agent",
      ],
    },
  },
} as const
