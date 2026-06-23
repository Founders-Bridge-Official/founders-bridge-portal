(function () {
  var SUPABASE_URL = 'https://suodxuignbbsxmqrfagx.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2R4dWlnbmJic3htcXJmYWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzI2MzAsImV4cCI6MjA5NjE0ODYzMH0.pQVau8xGbgQzVl7JijINms2ZEuaKzXmSQpwWS8jpbaY';

  var _origRemove = localStorage.removeItem.bind(localStorage);

  localStorage.removeItem = function (key) {
    _origRemove(key);
    if (key === 'fb_user') {
      // Find and invalidate the Supabase session
      var sbKey = Object.keys(localStorage).find(function (k) {
        return k.startsWith('sb-') && k.endsWith('-auth-token');
      });
      if (sbKey) {
        try {
          var session = JSON.parse(localStorage.getItem(sbKey) || 'null');
          if (session && session.access_token) {
            // Fire-and-forget: tell Supabase to invalidate this token
            fetch(SUPABASE_URL + '/auth/v1/logout', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + session.access_token,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
              }
            }).catch(function () {});
          }
        } catch (e) {}
      }
      // Clear all Supabase session data from localStorage
      Object.keys(localStorage)
        .filter(function (k) { return k.startsWith('sb-'); })
        .forEach(function (k) { _origRemove(k); });
    }
  };
})();
