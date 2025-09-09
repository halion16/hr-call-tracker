# 🔗 Guida Integrazione API Aziendale

## 📋 Come Integrare la Tua API

### 1. 🛠️ Prepara la Tua API

Il sistema HR Call Tracker ha bisogno di un endpoint per recuperare l'elenco dipendenti:

**Endpoint richiesto:**
```
GET /api/v1/employees
```

**Headers necessari:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
X-API-Version: v1
```

**Formato risposta richiesta:**
```json
{
  "data": [
    {
      "employeeId": "EMP001",
      "firstName": "Marco", 
      "lastName": "Rossi",
      "email": "marco.rossi@company.it",
      "position": "Developer",
      "department": "IT", 
      "hireDate": "2022-03-15",
      "phone": "+39 340 1234567",
      "status": "active"
    }
  ]
}
```

### 2. 🔄 Formati Alternativi Supportati

Il sistema può adattarsi a diversi formati. Questi campi verranno mappati automaticamente:

**Nomi campi alternativi:**
- `employeeId` ← `id`, `employee_id`
- `firstName` ← `first_name`, `nome`
- `lastName` ← `last_name`, `cognome`
- `position` ← `job_title`, `posizione`
- `department` ← `dept`, `dipartimento`
- `hireDate` ← `hire_date`, `dataAssunzione`
- `phone` ← `telefono`, `phoneNumber`
- `status` ← campo `active` (boolean)

**Esempio formato alternativo:**
```json
{
  "employees": [
    {
      "id": "001",
      "nome": "Marco",
      "cognome": "Rossi", 
      "job_title": "Developer",
      "dept": "IT",
      "hire_date": "2022-03-15",
      "telefono": "+39 340 1234567",
      "active": true
    }
  ]
}
```

### 3. 🧪 Test dell'Integrazione

**Fase 1: Configurazione**
1. Apri l'app HR Call Tracker
2. Vai su **Impostazioni**
3. Inserisci i dati della tua API:
   - **Endpoint**: `https://tuodominio.com/api`
   - **API Key**: La tua chiave di autenticazione
   - **Versione**: `v1`

**Fase 2: Test Connessione**
1. Clicca "**Testa Connessione**" per verificare
2. Se funziona, attiva "**Attiva API Reale**"
3. Vai su "**Dipendenti**" → "**Sincronizza API Aziendale**"

### 4. 🔒 Endpoint di Test (Opzionale)

Per il test della connessione, l'app prova a chiamare:
```
GET /api/health
```

Se non esiste, verrà saltato il test di connessione.

### 5. 🚨 Gestione Errori

Il sistema ha un **fallback automatico**:
- Se l'API reale fallisce, usa i dati mock
- Gli errori vengono loggati nella console del browser
- L'utente riceve notifiche chiare sugli errori

### 6. 🛡️ Sicurezza

**Headers di sicurezza supportati:**
```
Authorization: Bearer TOKEN
X-API-Key: YOUR_KEY
Cookie: session_token
```

**Timeout configurato:** 15 secondi

## 🧪 Testing in Modalità Mista

Puoi testare l'integrazione anche **senza avere l'API pronta**:

1. **Modalità Mock (default)**: Usa 6 dipendenti demo
2. **Modalità Reale**: Connessione alla tua API
3. **Switch istantaneo** tra le due modalità nelle impostazioni

## 📊 Monitoraggio

**Console del browser** (F12):
- ✅ `🌐 Chiamando API reale: https://tuodominio.com`
- ✅ `✅ Importati 25 dipendenti da API reale`
- ❌ `❌ Errore API reale, usando fallback mock`

## 🔧 Adattamento del Codice

Se hai un formato molto diverso, modifica il file:
```typescript
// src/lib/real-company-api.ts
// Linea 80: mapApiResponseToStandardFormat()
```

Personalizza il mapping dei campi per la tua API specifica.

## ⚡ Quick Start

**Per testare subito:**
1. Configura endpoint e API key in **Impostazioni**
2. Attiva "**API Reale**"
3. Vai su **Dipendenti** → **Sincronizza**
4. Verifica che i tuoi dipendenti appaiano nella lista

**L'app funziona in entrambe le modalità** - puoi sviluppare e testare con i mock, poi passare alla tua API quando è pronta!