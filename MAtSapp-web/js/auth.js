/**
 * Authentication – phone number based
 * In DEMO mode we accept any number and store locally.
 * With Supabase you can enable Phone Auth (Twilio / MessageBird etc.)
 */
const Auth = (() => {
  let pendingPhone = null;

  function normalizePhone(code, number) {
    const digits = (number || '').replace(/\D/g, '');
    return code + digits;
  }

  async function requestOtp(countryCode, phoneNumber) {
    const phone = normalizePhone(countryCode, phoneNumber);
    if (phone.length < 10) {
      throw new Error('Please enter a valid phone number');
    }
    pendingPhone = phone;

    if (DB.supabase && !CONFIG.DEMO_MODE) {
      // Real Supabase phone OTP
      const { error } = await DB.supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      return { phone, demo: false };
    }

    // DEMO: no SMS, just proceed to “OTP” step (accept any 6 digits or skip)
    console.info('Demo OTP for', phone, '→ use any 6 digits or 123456');
    return { phone, demo: true };
  }

  async function verifyOtp(otp) {
    if (!pendingPhone) throw new Error('No phone pending');

    if (DB.supabase && !CONFIG.DEMO_MODE) {
      const { data, error } = await DB.supabase.auth.verifyOtp({
        phone: pendingPhone,
        token: otp,
        type: 'sms'
      });
      if (error) throw error;
      // ensure profile exists
      const user = data.user;
      await DB.supabase.from('profiles').upsert({
        id: user.id,
        phone: pendingPhone,
        display_name: pendingPhone,
        updated_at: new Date().toISOString()
      });
      return await DB.getCurrentUser();
    }

    // DEMO mode
    if (!otp || otp.length < 4) {
      // allow empty / short for easy testing
    }
    let user = await DB.findUserByPhone(pendingPhone);
    if (!user) {
      user = {
        id: pendingPhone,
        phone: pendingPhone,
        display_name: pendingPhone,
        status_text: 'Hey there! I am using MAtSapp.',
        avatar_url: null,
        is_admin: pendingPhone.endsWith('0000') // simple admin flag for demo
      };
      await DB.saveUser(user);
    } else {
      await DB.saveUser(user);
    }
    return user;
  }

  async function completeProfile({ displayName, avatarDataUrl }) {
    const user = await DB.getCurrentUser();
    if (!user) throw new Error('Not logged in');
    user.display_name = displayName || user.phone;
    user.id = user.phone;
    if (avatarDataUrl) user.avatar_url = avatarDataUrl;
    await DB.saveUser(user);

    if (DB.supabase && !CONFIG.DEMO_MODE) {
      await DB.supabase.from('profiles').update({
        display_name: user.display_name,
        avatar_url: user.avatar_url
      }).eq('id', user.id);
    }
    return user;
  }

  async function logout() {
    if (DB.supabase) {
      await DB.supabase.auth.signOut();
    }
    localStorage.removeItem('matsapp_currentUser');
    location.reload();
  }

  async function isLoggedIn() {
    const u = await DB.getCurrentUser();
    return !!u;
  }

  return {
    requestOtp,
    verifyOtp,
    completeProfile,
    logout,
    isLoggedIn,
    get pendingPhone() { return pendingPhone; }
  };
})();
