# HR Call Tracker

Sistema di tracciamento call HR per gestire i recap periodici con i dipendenti.

## 🚀 Caratteristiche Principali

### ✅ Già Implementato
- **Dashboard Interattiva** - Panoramica completa con statistiche in tempo reale e KPI avanzati
- **Gestione Dipendenti** - Sincronizzazione automatica da API aziendale
- **Pianificazione Call** - Schedulazione semplice e intuitiva
- **Tracciamento Completo** - Registrazione durata, note e valutazioni
- **Calendario Avanzato** - Vista mensile, settimanale e giornaliera con filtri
- **Reportistica Completa** - Grafici interattivi, filtri temporali e export dati
- **Notifiche Email/SMS** - Sistema completo per promemoria e avvisi automatici
- **Centro Notifiche** - Gestione notifiche interne con badge e contatori
- **Persistenza Locale** - Tutti i dati salvati in localStorage per testing
- **Mock API** - Simulazione integrazione con sistema aziendale

### 📋 Funzionalità

1. **Dashboard**
   - Statistiche in tempo reale
   - Prossime call programmate
   - Azioni rapide

2. **Gestione Dipendenti**
   - Import automatico da API aziendale
   - Visualizzazione dettagli dipendenti
   - Schedulazione diretta call

3. **Gestione Call**
   - Pianificazione con data/ora
   - Completamento con note e valutazione
   - Programmazione automatica call successive
   - Storico completo

## 🛠️ Tecnologie

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Storage**: localStorage (modalità test)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS + Shadcn/ui components

## 🚦 Come Iniziare

1. **Avvia l'applicazione**:
   ```bash
   npm run dev
   ```

2. **Accedi** a http://localhost:3001

3. **Prima configurazione**:
   - Vai su "Dipendenti"
   - Clicca "Sincronizza API Aziendale" per importare i dipendenti mock
   - Vai su "Impostazioni" → "Notifiche" per configurare email/SMS
   - Inizia a schedulare le tue prime call!

4. **Configurazione Email/SMS** (Opzionale):
   - Copia `.env.local.example` in `.env.local`  
   - Configura credenziali SMTP (Gmail/Outlook) per email
   - Configura Twilio per SMS
   - Testa le notifiche dal pannello impostazioni

## 📱 Guida Rapida

### Sincronizzare Dipendenti
1. Vai alla pagina "Dipendenti"
2. Clicca "Sincronizza API Aziendale"
3. I dipendenti attivi verranno importati automaticamente

### Pianificare una Call
1. Dalla dashboard o dalla pagina "Call", clicca "Pianifica Nuova Call"
2. Seleziona dipendente, data/ora e note opzionali
3. La call viene aggiunta al calendario

### Completare una Call
1. Dalla pagina "Call", trova la call programmata
2. Clicca "Completa" 
3. Inserisci durata, valutazione e note
4. Opzionalmente programma la call successiva

## 🔧 Configurazione API Aziendale

Attualmente configurato con mock API per testing:

```typescript
// Mock API Credentials
endpoint: 'https://company-api.example.com'
version: 'v1'
```

### Per Integrazione Reale
1. Modifica `src/lib/mock-company-api.ts`
2. Sostituisci le chiamate mock con API reali
3. Configura autenticazione e endpoint corretti

## 📊 Struttura Dati

### Dipendente
```typescript
{
  id: string;
  nome: string;
  cognome: string;
  email: string;
  posizione: string;
  dipartimento: string;
  dataAssunzione: string;
  telefono?: string;
  isActive: boolean;
}
```

### Call
```typescript
{
  id: string;
  employeeId: string;
  dataSchedulata: string;
  dataCompletata?: string;
  durata?: number;
  note?: string;
  rating?: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  nextCallDate?: string;
}
```

## 🎯 Prossimi Sviluppi

- [x] **Calendario Visuale** con eventi ✅ **COMPLETATO**
- [x] **Reportistica Avanzata** ✅ **COMPLETATO**
- [x] **Integrazione Email/SMS** per promemoria ✅ **COMPLETATO**
- [x] **Esportazione Dati** (JSON) ✅ **COMPLETATO**
- [ ] **Database Persistente** (PostgreSQL + Prisma)
- [ ] **Autenticazione Utenti**
- [ ] **API REST** per integrazioni esterne
- [ ] **Esportazione PDF/CSV Avanzata**

## 🔄 Migrazione a Database

Quando sarai pronto per il database:

1. **Installa Prisma**:
   ```bash
   npm install prisma @prisma/client
   ```

2. **Configura PostgreSQL**

3. **Migra dati** da localStorage al database

4. **Sostituisci** LocalStorage con chiamate API

## 📝 Note di Sviluppo

- **Dati Mock**: L'app include 6 dipendenti di esempio
- **Persistenza**: Tutti i dati vengono salvati in localStorage
- **Reset Dati**: Cancella localStorage per reset completo
- **Sincronizzazione**: La mock API simula ritardi reali (1-2 secondi)

L'applicazione è **pronta per il testing** e può essere facilmente estesa con database reale e funzionalità aggiuntive!
