# 📧📱 Sistema Email/SMS - Guida Configurazione

Questo documento spiega come configurare e utilizzare il sistema di notifiche email/SMS reali nell'applicazione HR Call Tracker.

## 🚀 Panoramica

Il sistema supporta:
- ✅ **Email HTML professionali** via SMTP (Gmail, Outlook, server personalizzati)
- ✅ **SMS** via Twilio
- ✅ **Template personalizzabili** per promemoria e avvisi
- ✅ **API REST** per integrazioni esterne
- ✅ **Pannello di configurazione** nell'app
- ✅ **Test delle notifiche** in tempo reale

## 📋 Configurazione

### 1. File di Configurazione

Copia `.env.local.example` in `.env.local`:
```bash
cp .env.local.example .env.local
```

### 2. Configurazione Email (SMTP)

#### Opzione A: Gmail
1. Abilita **Autenticazione a 2 fattori** nel tuo account Google
2. Genera una **App Password**:
   - Vai su https://myaccount.google.com/security
   - "Autenticazione a 2 fattori" → "Password per le app"
   - Seleziona "Mail" e genera la password

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuo-email@gmail.com
SMTP_PASS=la-tua-app-password
```

#### Opzione B: Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=tuo-email@outlook.com
SMTP_PASS=la-tua-password
```

#### Opzione C: Server SMTP Aziendale
```env
SMTP_HOST=mail.tuaazienda.com
SMTP_PORT=587
SMTP_USER=hr@tuaazienda.com
SMTP_PASS=password-sicura
```

### 3. Configurazione SMS (Twilio)

1. Registrati su https://console.twilio.com
2. Ottieni le credenziali dal Dashboard:
   - **Account SID**
   - **Auth Token**
   - **Phone Number** (acquista un numero Twilio)

```env
TWILIO_ACCOUNT_SID=your-account-sid-here
TWILIO_AUTH_TOKEN=your-secret-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Configurazioni Opzionali

```env
HR_MANAGER_EMAIL=manager.hr@azienda.com
HR_MANAGER_NAME=Mario Rossi
COMPANY_NAME=La Tua Azienda S.r.l.
```

## 🎯 Come Utilizzare

### 1. Pannello Impostazioni

1. Vai su **Impostazioni** → **Notifiche**
2. Verifica lo **Stato Servizi** (dovrebbero essere configurati ✅)
3. Configura le **Preferenze** (Email/SMS/Entrambi)
4. **Testa le notifiche** con i tuoi contatti

### 2. Invio Manuale

Dalla pagina **Call**, ogni call ha pulsanti per:
- 📧 **Invia Promemoria** - per call programmate
- ⚠️ **Invia Avviso** - per call in ritardo

### 3. API REST

#### Endpoint: `/api/notifications/send`

**Promemoria Call:**
```bash
curl -X POST http://localhost:3001/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "call_reminder",
    "employeeName": "Mario Rossi",
    "employeeEmail": "mario.rossi@azienda.com",
    "employeePhone": "+393331234567",
    "callDate": "15 Novembre 2024",
    "callTime": "14:30",
    "method": "email"
  }'
```

**Avviso Ritardo:**
```bash
curl -X POST http://localhost:3001/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "overdue_notification",
    "employeeName": "Mario Rossi",
    "employeeEmail": "mario.rossi@azienda.com",
    "employeePhone": "+393331234567",
    "daysOverdue": 3,
    "method": "both"
  }'
```

## 📧 Template Email

Le email inviate hanno:
- ✅ **Design HTML responsivo**
- ✅ **Branding aziendale**
- ✅ **Informazioni call complete**
- ✅ **CTA chiari per il dipendente**
- ✅ **Versione testuale** per client semplici

### Esempio Template Promemoria:
```
📞 Call HR Programmata

Ciao Mario Rossi,

Ti ricordiamo che hai una call programmata per il recap periodico:

📅 Data: 15 Novembre 2024
⏰ Orario: 14:30
👤 Con: Responsabile HR

La call è un momento importante per discutere insieme 
del tuo percorso professionale, degli obiettivi e di 
eventuali necessità di supporto.
```

## 📱 Template SMS

Gli SMS sono concisi e includono:
- Nome dipendente
- Data e ora call
- Tipo di notifica (promemoria/urgente)
- Branding aziendale

### Esempio SMS Promemoria:
```
📞 HR Call Reminder

Hi Mario Rossi,

Your HR call is scheduled for:
15 Nov 2024 at 14:30

Please don't miss it!

- HR Team
```

## 🔧 Troubleshooting

### Problema: Email non arrivano

**Soluzioni:**
1. ✅ Verifica credenziali SMTP in `.env.local`
2. ✅ Controlla che il server SMTP supporti TLS
3. ✅ Per Gmail: usa App Password, non la password normale
4. ✅ Verifica che non finiscano in SPAM
5. ✅ Testa con il pannello nell'app

### Problema: SMS non arrivano

**Soluzioni:**
1. ✅ Verifica credenziali Twilio
2. ✅ Controlla saldo account Twilio
3. ✅ Verifica formato numero telefono (+39...)
4. ✅ Controlla stato servizio Twilio

### Problema: API non funziona

**Soluzioni:**
1. ✅ Riavvia il server: `npm run dev`
2. ✅ Controlla logs console per errori
3. ✅ Verifica formato JSON richiesta
4. ✅ Testa endpoint configurazione: `/api/notifications/send?test=config`

## 💡 Best Practices

### Sicurezza
- 🔒 **Non committare** mai credenziali nel codice
- 🔒 Usa **App Password** per Gmail
- 🔒 **Rotazione regolare** delle password SMTP
- 🔒 **Monitoraggio accessi** account email/SMS

### Performance  
- ⚡ Le notifiche sono **asincrone** (non bloccanti)
- ⚡ **Retry automatico** per fallimenti temporanei
- ⚡ **Rate limiting** per evitare spam
- ⚡ **Cache template** per performance

### UX
- 👤 **Personalizzazione** nome dipendente/azienda
- 👤 **Template responsive** per mobile
- 👤 **Feedback visivo** nell'interfaccia
- 👤 **Test facili** dal pannello impostazioni

## 🎮 Demo e Test

### Test Rapido
1. Avvia l'app: `npm run dev`
2. Vai su http://localhost:3001/settings
3. Clicca tab "Notifiche"
4. Inserisci email/telefono di test
5. Clicca "Test Email" o "Test SMS"

### Costi Approssimativi
- **Email SMTP**: Gratuito (Gmail) o €5-20/mese (server dedicato)
- **SMS Twilio**: ~€0.08 per SMS in Italia
- **Manutenzione**: Minima (sistema self-hosted)

## 📞 Supporto

Per problemi o domande:
1. 📖 Consulta questo documento
2. 🔍 Verifica logs applicazione
3. 🧪 Usa i test integrati nell'app
4. 📧 Contatta il team di sviluppo

---

**🎉 Il sistema è ora pronto per l'uso in produzione!**

Le notifiche email/SMS sono completamente integrate nell'applicazione HR Call Tracker e pronte per migliorare la comunicazione con i dipendenti.