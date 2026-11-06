/**
 * Authentication – phone number based
 * Does NOT use Supabase Phone Auth (no SMS provider needed).
 * Users are stored in the profiles table + localStorage.
 * Any 4+ digit code is accepted as OTP.
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

    // We never call Supabase Auth SMS – avoids "Unsupported phone provider"
    console.info('MAtSapp login for', phone, '→ enter any 4+ digit code (e.g. 123456)');
    return { phone, demo: true };
  }

  async function verifyOtp(otp) {
    if (!pendingPhone) throw new Error('No phone pending');

    // Accept any code with at least 4 characters
    if (!otp || String(otp).trim().length < 4) {
      throw new Error('Enter the verification code (any 4+ digits, e.g. 123456)');
    }

    // Find or create user
    let user = await DB.findUserByPhone(pendingPhone);

    if (!user) {
      user = {
        id: pendingPhone,
        phone: pendingPhone,
        display_name: pendingPhone,
        status_text: 'Hey there! I am using MAtSapp.',
        avatar_url: null,
        is_admin: pendingPhone.endsWith('0000') || pendingPhone.endsWith('00000')
      };
    } else {
      // ensure id is phone
      user.id = user.phone || pendingPhone;
    }

    await DB.saveUser(user);   // saves to localStorage + Supabase profiles table
    return user;
  }

  async function completeProfile({ displayName, avatarDataUrl }) {
    const user = await DB.getCurrentUser();
    if (!user) throw new Error('Not logged in');

    user.display_name = displayName || user.phone;
    user.id = user.phone;
    if (avatarDataUrl) user.avatar_url = avatarDataUrl;

    await DB.saveUser(user);
    return user;
  }

  async function logout() {
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
