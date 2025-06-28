# Credit Management System Documentation

## 🎯 Overview

The Credit Management System provides granular control over test access and usage through a comprehensive credit-based architecture. Companies can be assigned specific test type permissions and credit allocations, enabling flexible business models and usage tracking.

## 🏗️ Architecture

### Database Schema

#### New Enums
```sql
enum TestType {
  SPEAKING      -- Voice/Speaking assessments
  PROFICIENCY   -- Language proficiency MCQ tests
  EQ            -- Emotional Intelligence assessments
  WRITING       -- Writing assessments
}

enum CreditTransactionType {
  PURCHASE      -- Credits purchased/assigned
  CONSUMPTION   -- Credits used for tests
  REFUND        -- Credits refunded
  ADJUSTMENT    -- Manual credit adjustments
  EXPIRY        -- Credits expired
}
```

#### Core Models

**CompanyTestPermission** - Controls which test types a company can access
```sql
- companyId: String (FK to Company)
- testType: TestType
- isEnabled: Boolean
- createdAt/updatedAt: DateTime
```

**CompanyCredit** - Manages credit balances per test type
```sql
- companyId: String (FK to Company)
- testType: TestType
- totalCredits: Int
- usedCredits: Int
- availableCredits: Int (computed)
- expiryDate: DateTime?
- isActive: Boolean
```

**CreditTransaction** - Audit trail for all credit operations
```sql
- companyId: String (FK to Company)
- testType: TestType
- transactionType: CreditTransactionType
- amount: Int (positive for additions, negative for consumption)
- balanceBefore/balanceAfter: Int
- description: String?
- referenceId: String? (test ID, purchase ID, etc.)
- referenceType: String? ('test', 'purchase', 'adjustment')
- createdBy: String? (FK to Admin)
```

## 🔧 Implementation Components

### 1. Credit Service (`src/services/creditService.ts`)

Core service handling all credit operations:

#### Credit Management
- `assignCredits()` - Assign credits to companies
- `consumeCredits()` - Consume credits for test creation
- `getCreditBalance()` - Get available credits for test type
- `refundCredits()` - Refund credits from transactions

#### Permission Management
- `setTestPermissions()` - Set company test permissions
- `hasTestPermission()` - Check if company has permission
- `getCompanyPermissions()` - Get all company permissions

#### Analytics & Reporting
- `getCreditAnalytics()` - Usage analytics per company
- `getGlobalCreditStats()` - Global statistics for super admin
- `getCreditTransactions()` - Transaction history

### 2. Credit Validation Middleware (`src/middleware/creditValidation.ts`)

Middleware for protecting test creation endpoints:

```typescript
// Validate credits before test creation
validateCreditsAndPermissions(TestType.PROFICIENCY)

// Consume credits after successful test creation
consumeCreditsAfterTest

// Validate bulk operations
validateBulkCredits(TestType.EQ, 'quantity')
```

### 3. API Routes (`src/routes/credits.ts`)

Comprehensive REST API for credit management:

#### Company Routes
- `GET /api/credits/balance/:companyId` - Get all credit balances
- `GET /api/credits/balance/:companyId/:testType` - Get specific balance
- `GET /api/credits/permissions/:companyId` - Get test permissions
- `GET /api/credits/transactions/:companyId` - Get transaction history
- `GET /api/credits/analytics/:companyId` - Get usage analytics
- `POST /api/credits/validate` - Validate test creation

#### Super Admin Routes
- `POST /api/credits/assign` - Assign credits to companies
- `PUT /api/credits/permissions/:companyId` - Update permissions
- `POST /api/credits/refund` - Refund credits
- `GET /api/credits/global-stats` - Global statistics
- `POST /api/credits/expire-old` - Expire old credits

### 4. Migration Script (`src/scripts/migrate-to-credit-system.ts`)

Automated migration from legacy credit system:
- Converts old company credits to new system
- Sets up default permissions based on usage history
- Creates audit trail for all migrations
- Provides verification and rollback capabilities

## 📊 Business Use Cases

### Company A: EQ Tests Only
```typescript
// Setup
await creditService.setTestPermissions('company-a', [TestType.EQ]);
await creditService.assignCredits('company-a', TestType.EQ, 1000);

// Result: Company A can only create EQ tests with 1000 credits
```

### Company B: Multi-Test Type
```typescript
// Setup
await creditService.setTestPermissions('company-b', [
  TestType.EQ, 
  TestType.SPEAKING, 
  TestType.WRITING
]);

await creditService.assignCredits('company-b', TestType.EQ, 500);
await creditService.assignCredits('company-b', TestType.SPEAKING, 1000);
await creditService.assignCredits('company-b', TestType.WRITING, 2000);

// Result: Company B has different credit pools for each test type
```

## 🔐 Security & Validation

### Permission Checks
- All test creation endpoints validate permissions before processing
- Middleware automatically checks company authorization
- Graceful error handling with specific error codes

### Credit Validation
- Pre-flight validation before test creation
- Atomic credit consumption with transaction safety
- Automatic rollback on test creation failure

### Audit Trail
- Complete transaction history for all credit operations
- Admin attribution for manual operations
- Reference tracking to original tests/purchases

## 📈 Analytics & Reporting

### Company-Level Analytics
```typescript
const analytics = await creditService.getCreditAnalytics(companyId, 30);
// Returns: { EQ: { consumed: 45, tests: 45 }, WRITING: { consumed: 23, tests: 23 } }
```

### Global Statistics
```typescript
const stats = await creditService.getGlobalCreditStats();
// Returns credit usage across all companies by test type
```

### Transaction History
```typescript
const transactions = await creditService.getCreditTransactions(companyId, {
  testType: TestType.EQ,
  startDate: new Date('2024-01-01'),
  limit: 50
});
```

## 🚀 API Usage Examples

### Check Available Credits
```bash
GET /api/credits/balance/company-123/EQ
```
```json
{
  "companyId": "company-123",
  "testType": "EQ",
  "availableCredits": 847
}
```

### Assign Credits (Super Admin)
```bash
POST /api/credits/assign
{
  "companyId": "company-123",
  "testType": "PROFICIENCY",
  "amount": 500,
  "expiryDate": "2024-12-31",
  "description": "Q4 credit allocation"
}
```

### Update Permissions (Super Admin)
```bash
PUT /api/credits/permissions/company-123
{
  "permissions": ["EQ", "WRITING", "PROFICIENCY"]
}
```

### Get Transaction History
```bash
GET /api/credits/transactions/company-123?testType=EQ&limit=20
```

## 🛠️ Integration with Existing Tests

### Test Creation Flow
1. **Validation**: Middleware checks permissions and credits
2. **Creation**: Test is created if validation passes
3. **Consumption**: Credits are automatically consumed
4. **Tracking**: Transaction is recorded for audit

### Updated Test Models
All test models now include:
```typescript
creditsConsumed: Int @default(1)
creditTransaction: String? // Reference to transaction ID
```

## 🔄 Migration & Deployment

### Database Migration
```bash
npx prisma migrate dev --name add_credit_management_system
```

### Data Migration
```bash
npx ts-node src/scripts/migrate-to-credit-system.ts
```

### Verification
- Automated verification of migration results
- Credit balance validation
- Permission consistency checks

## 📋 Administrative Tasks

### Assign Credits to New Company
```typescript
// 1. Set permissions
await creditService.setTestPermissions(companyId, [
  TestType.EQ, 
  TestType.PROFICIENCY
]);

// 2. Assign credits
await creditService.assignCredits(companyId, TestType.EQ, 100);
await creditService.assignCredits(companyId, TestType.PROFICIENCY, 200);
```

### Handle Credit Refunds
```typescript
// Refund credits from a specific transaction
await creditService.refundCredits(
  transactionId, 
  'Test cancelled by user', 
  adminId
);
```

### Monitor Credit Usage
```typescript
// Get companies with low credits
const companies = await prisma.companyCredit.findMany({
  where: { 
    availableCredits: { lt: 10 },
    isActive: true 
  },
  include: { company: true }
});
```

## 🚨 Error Handling

### Common Error Codes
- **400**: Invalid test type or missing parameters
- **402**: Insufficient credits
- **403**: No permission for test type
- **404**: Company or transaction not found
- **500**: Internal server error

### Error Response Format
```json
{
  "error": "Insufficient EQ credits",
  "availableCredits": 5,
  "requiredCredits": 1,
  "testType": "EQ"
}
```

## 🔮 Future Enhancements

### Planned Features
- **Credit Packages**: Bulk credit purchases with discounts
- **Subscription Model**: Recurring credit allocation
- **Credit Sharing**: Transfer credits between test types
- **Usage Predictions**: ML-based credit need forecasting
- **Automated Alerts**: Low credit notifications
- **API Integration**: External payment system integration

### Performance Optimizations
- **Caching**: Redis cache for frequent credit checks
- **Bulk Operations**: Batch credit assignments
- **Background Jobs**: Async credit expiry processing

## 📊 Monitoring & Metrics

### Key Metrics to Track
- Credit consumption rate per test type
- Average credits per test
- Credit expiry rates
- Permission utilization
- Transaction volume

### Recommended Alerts
- Companies with < 10 credits remaining
- High credit consumption spikes
- Failed credit transactions
- Permission violations

---

## 🎉 Benefits Achieved

✅ **Granular Control**: Per-test-type credit management  
✅ **Flexible Business Models**: Different pricing for different tests  
✅ **Complete Audit Trail**: Full transaction history  
✅ **Automated Validation**: Prevents unauthorized test creation  
✅ **Scalable Architecture**: Ready for enterprise growth  
✅ **Analytics Ready**: Comprehensive usage tracking  

The Credit Management System transforms Lumi6 from a simple credit system into a sophisticated, enterprise-ready platform with granular control over test access and usage. 