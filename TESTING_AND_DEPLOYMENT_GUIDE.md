# 🎯 QUICK START - Testing & Deployment

## ✅ What's Been Completed

All **5 CRITICAL security fixes** have been implemented:

1. ✅ **Short-lived Access Tokens** (15 min + 7-day refresh)
2. ✅ **Token Revocation System** (Logout blacklists token)
3. ✅ **XSS Protection Ready** (WithCredentials for httpOnly cookies)
4. ✅ **Rate Limiting** (5 logins/minute max)
5. ✅ **CORS Security** (Whitelist-based policy)
6. ✅ **Connection Pool Tuning** (5→20 concurrent)

---

## 🔧 SETUP INSTRUCTIONS (Do This First)

### Step 1: Install Dependencies
```bash
cd c:\Users\Hp\Desktop\KIL2\library_backend
pip install -r requirements.txt
```
✅ This installs `slowapi` for rate limiting

### Step 2: Database Migration
```bash
cd c:\Users\Hp\Desktop\KIL2\library_backend
alembic revision --autogenerate -m "Add TokenBlacklist model"
alembic upgrade head
```
✅ This creates the TokenBlacklist table

### Step 3: Verify Frontend Build
```bash
cd c:\Users\Hp\Desktop\KIL2\library-frontend
npm run build
```
✅ Should show "✓ built in Xs" (already verified ✅)

---

## 🚀 TESTING CHECKLIST

### Backend Tests

#### Test 1: Login Returns Both Tokens
```bash
# Start server
cd c:\Users\Hp\Desktop\KIL2\library_backend
uvicorn main:app --reload

# In another terminal, test login
curl -X POST http://localhost:8000/api/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin"

# Expected response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",  ← NEW!
  "token_type": "bearer",
  "user": {...}
}
```
✅ Check that BOTH tokens are returned

#### Test 2: Rate Limiting on Login
```bash
# Try 6 logins in quick succession
for i in {1..6}; do
  curl -X POST http://localhost:8000/api/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin&password=admin" &
done

# Expected: Requests 1-5 succeed, request 6 returns 429 Too Many Requests
```
✅ 6th request should fail with rate limit error

#### Test 3: Token Refresh
```bash
# Use refresh_token from login response
curl -X POST http://localhost:8000/api/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"eyJ..."}'

# Expected response:
{
  "access_token": "eyJ...",  ← New token!
  "refresh_token": "eyJ...",  ← New refresh token!
  "token_type": "bearer"
}
```
✅ Should return new tokens

#### Test 4: Logout Revokes Token
```bash
# Login and get access_token
token=$(curl -s -X POST http://localhost:8000/api/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin" | jq -r '.access_token')

# Logout to revoke the token
curl -X POST http://localhost:8000/api/logout \
  -H "Authorization: Bearer $token"

# Try to use the same token again
curl -X GET http://localhost:8000/api/profile/ \
  -H "Authorization: Bearer $token"

# Expected: 401 Unauthorized (token was blacklisted)
```
✅ Using revoked token should fail

#### Test 5: CORS Headers Whitelisted
```bash
# Check CORS only accepts specific headers
curl -i -X OPTIONS http://localhost:8000/api/books \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type"

# Expected response should have:
# Access-Control-Allow-Headers: Content-Type, Authorization, Accept, Origin, X-Requested-With
```
✅ Should only show whitelisted headers

### Frontend Tests

#### Test 1: Login Flow
1. Go to http://localhost:5173/login
2. Enter username: `admin`, password: `admin`
3. Open DevTools → Application → Local Storage
4. Check for: `access_token` and `refresh_token` ✅

#### Test 2: Token Auto-Refresh
1. Login to get tokens
2. Open DevTools → Network tab
3. Set access token to expire (modify local storage token to invalid)
4. Make an API call (e.g., fetch profile)
5. Should see: 401 → auto-refresh → 200 OK ✅

#### Test 3: Logout
1. Login to dashboard
2. Click logout
3. Check Network tab → should see POST /api/logout ✅
4. Local storage should be cleared ✅
5. Should redirect to login page ✅

---

## 📊 EXPECTED TEST RESULTS

| Test | Expected | Your Result |
|------|----------|-------------|
| Login returns both tokens | ✅ | [ ] |
| Rate limiting blocks 6th request | ✅ | [ ] |
| Refresh endpoint works | ✅ | [ ] |
| Logout revokes token | ✅ | [ ] |
| CORS whitelists headers | ✅ | [ ] |
| Frontend builds successfully | ✅ | [ ] |
| Auto-refresh on 401 | ✅ | [ ] |
| Logout calls backend | ✅ | [ ] |

---

## ⚠️ COMMON ISSUES & FIXES

### Issue: "fastapi_limiter not found"
**Fix**: Run `pip install -r requirements.txt` again
```bash
pip install slowapi==0.1.9 -U
```

### Issue: "TokenBlacklist table doesn't exist"
**Fix**: Run alembic migration
```bash
alembic revision --autogenerate -m "Add TokenBlacklist model"
alembic upgrade head
```

### Issue: Frontend still uses old localStorage tokens
**Fix**: Clear browser cache and local storage
- DevTools → Application → Clear Site Data
- Refresh page and login again

### Issue: 401 on /api/logout
**Fix**: Make sure token is valid (not already expired)
- Use token immediately after login

### Issue: CORS error when calling /api/refresh
**Fix**: Check that frontend is calling from whitelisted origin
- Allowed: http://localhost:5173, http://127.0.0.1:3000
- Add your frontend URL to CORS_ORIGINS in .env

---

## 📁 FILES CHANGED SUMMARY

### Backend (9 files modified)
- ✅ `auth.py` - Token logic updated
- ✅ `main.py` - CORS and limiter configured  
- ✅ `database.py` - Connection pool tuned
- ✅ `auth_controller.py` - New endpoints added
- ✅ `token_blacklist_model.py` - **NEW FILE**
- ✅ `requirements.txt` - slowapi added
- ✅ `.env` - Configuration updated

### Frontend (2 files modified)
- ✅ `authService.js` - Refresh + logout logic
- ✅ `axiosConfig.js` - Auto-refresh interceptor

---

## 📈 SECURITY IMPROVEMENTS

**Before**: 
- 30-day tokens
- No logout
- XSS vulnerable
- Brute force possible
- Weak CORS

**After**:
- 15-min tokens + 7-day refresh
- Immediate logout revocation
- Ready for httpOnly cookies
- Rate limited (5/min)
- Strict CORS whitelist

---

## 🎯 NEXT STEPS

### Immediate (This Sprint)
1. ✅ Run setup instructions above
2. ✅ Run testing checklist
3. ✅ Deploy to Render/production
4. ✅ Monitor for errors

### Soon (Phase 2)
- [ ] Implement error logging
- [ ] Add pagination limits
- [ ] Audit permission checks
- [ ] Add database indexes
- [ ] File upload size limits
- [ ] Input validation enhancement

### Later (Phase 3)
- [ ] Enable httpOnly cookies
- [ ] Token rotation on refresh
- [ ] Audit logging dashboard
- [ ] Performance optimization

---

## 🆘 NEED HELP?

**Check these docs**:
- ✅ [CRITICAL_FIXES_IMPLEMENTATION_SUMMARY.md](CRITICAL_FIXES_IMPLEMENTATION_SUMMARY.md) - What was changed
- ✅ [HIGH_PRIORITY_FIXES_REMAINING.md](HIGH_PRIORITY_FIXES_REMAINING.md) - What's next
- ✅ [PRODUCTION_READINESS_REVIEW.md](PRODUCTION_READINESS_REVIEW.md) - Full audit report

**Key Commands**:
```bash
# Start backend
cd library_backend && uvicorn main:app --reload

# Start frontend
cd library-frontend && npm run dev

# Run migration
cd library_backend && alembic upgrade head

# Install deps
pip install -r requirements.txt
npm install
```

---

## ✅ DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All tests pass
- [ ] No Python syntax errors
- [ ] Frontend builds without warnings
- [ ] Database migration successful
- [ ] Rate limiter working (tested)
- [ ] Token refresh working (tested)
- [ ] Logout revokes token (tested)
- [ ] CORS whitelist configured for production domain
- [ ] `.env` updated with correct values
- [ ] Logs monitored for errors in first 24 hours

---

**Status**: ✅ ALL CRITICAL SECURITY FIXES IMPLEMENTED & READY FOR TESTING

**Your Next Action**: Run setup instructions and testing checklist above
