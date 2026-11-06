
-- Only truncate tables that exist (skip any that weren't created)
do $$
begin
    -- Child tables (ignore errors if table doesn't exist)
    begin truncate table payments restart identity cascade; exception when others then null; end;
    begin truncate table phone_verifications restart identity cascade; exception when others then null; end;
    begin truncate table email_verifications restart identity cascade; exception when others then null; end;
    begin truncate table notifications restart identity cascade; exception when others then null; end;
    begin truncate table reviews restart identity cascade; exception when others then null; end;
    begin truncate table cake_sizes restart identity cascade; exception when others then null; end;
    begin truncate table order_status_history restart identity cascade; exception when others then null; end;
    begin truncate table order_tracking restart identity cascade; exception when others then null; end;
    begin truncate table whatsapp_messages restart identity cascade; exception when others then null; end;
    begin truncate table abandoned_carts restart identity cascade; exception when others then null; end;
    begin truncate table whatsapp_opt_outs restart identity cascade; exception when others then null; end;
    begin truncate table promo_uses restart identity cascade; exception when others then null; end;
    begin truncate table referral_usage restart identity cascade; exception when others then null; end;

    -- Parent tables
    begin truncate table orders restart identity cascade; exception when others then null; end;
    begin truncate table cakes restart identity cascade; exception when others then null; end;
    begin truncate table promo_codes restart identity cascade; exception when others then null; end;
    begin truncate table blog_posts restart identity cascade; exception when others then null; end;
    begin truncate table banners restart identity cascade; exception when others then null; end;
    begin truncate table referrals restart identity cascade; exception when others then null; end;
    begin truncate table settings restart identity cascade; exception when others then null; end;
    begin truncate table profiles restart identity cascade; exception when others then null; end;
end $$;

