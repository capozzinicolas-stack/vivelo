-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Services
CREATE POLICY "Active services are viewable by everyone" ON services FOR SELECT USING (status = 'active' OR provider_id = auth.uid());
CREATE POLICY "Providers can insert own services" ON services FOR INSERT WITH CHECK (provider_id = auth.uid());
CREATE POLICY "Providers can update own services" ON services FOR UPDATE USING (provider_id = auth.uid());
CREATE POLICY "Providers can delete own services" ON services FOR DELETE USING (provider_id = auth.uid());

-- Extras
CREATE POLICY "Extras viewable with service" ON extras FOR SELECT USING (true);
CREATE POLICY "Providers can manage extras" ON extras FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM services WHERE id = service_id AND provider_id = auth.uid())
);
CREATE POLICY "Providers can update extras" ON extras FOR UPDATE USING (
  EXISTS (SELECT 1 FROM services WHERE id = service_id AND provider_id = auth.uid())
);
CREATE POLICY "Providers can delete extras" ON extras FOR DELETE USING (
  EXISTS (SELECT 1 FROM services WHERE id = service_id AND provider_id = auth.uid())
);

-- Bookings
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (client_id = auth.uid() OR provider_id = auth.uid());
CREATE POLICY "Clients can create bookings" ON bookings FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "Involved parties can update bookings" ON bookings FOR UPDATE USING (client_id = auth.uid() OR provider_id = auth.uid());

-- Blocked Dates
CREATE POLICY "Blocked dates viewable by everyone" ON blocked_dates FOR SELECT USING (true);
CREATE POLICY "Providers can manage blocked dates" ON blocked_dates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM services WHERE id = service_id AND provider_id = auth.uid())
);
CREATE POLICY "Providers can delete blocked dates" ON blocked_dates FOR DELETE USING (
  EXISTS (SELECT 1 FROM services WHERE id = service_id AND provider_id = auth.uid())
);

-- Reviews
CREATE POLICY "Reviews viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Clients can create reviews" ON reviews FOR INSERT WITH CHECK (client_id = auth.uid());
