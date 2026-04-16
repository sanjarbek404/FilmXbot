export const isAdmin = (userId) => {
    let adminIdsEnv = process.env.ADMIN_ID;
    if (!adminIdsEnv) {
        console.warn('❌ [DEBUG] isAdmin check failed: process.env.ADMIN_ID is empty or undefined!');
        return false;
    }
    // Strip all quotes, brackets, and newlines
    adminIdsEnv = adminIdsEnv.replace(/['"\[\]\r\n]/g, '');
    const adminIds = adminIdsEnv.split(',').map(id => id.trim());
    
    const userString = userId.toString();
    const isMatch = adminIds.includes(userString);
    
    if (!isMatch) {
       console.warn(`❌ [DEBUG] isAdmin check failed: User (${userString}) not found in ADMIN_ID (${JSON.stringify(adminIds)})`);
    } else {
       console.log(`✅ [DEBUG] isAdmin check SUCCESS: User (${userString}) matched!`);
    }

    return isMatch;
};
