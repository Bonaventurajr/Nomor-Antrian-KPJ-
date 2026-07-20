// ============================================================
// FIREBASE INIT
// ============================================================
let database = null;
let firebaseEnabled = false;

try {
    if (firebaseConfig && firebaseConfig.apiKey !== "AIzaSyDummyKeyExample123456") {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        firebaseEnabled = true;
        console.log('🔥 Firebase Connected');
    }
} catch (e) {
    console.log('⚠️ Firebase not configured, using localStorage only');
}

// ============================================================
// DATA PESERTA DEFAULT (391 peserta dari Excel)
// ============================================================
const DEFAULT_PESERTA = [
    { nip: "12019114610", nama: "ABDUL ALBANI", bagian: "GA" },
    { nip: "12022084840", nama: "ACHMAD FIQRI LISTIANTO", bagian: "PACK R6" },
    { nip: "12009113602", nama: "ACHMAD MUNGAMAR", bagian: "PACK R63" },
    { nip: "11996022428", nama: "ACHMAD SURYA", bagian: "ALKALINE" },
    { nip: "11995052271", nama: "ADE KUSNIAWATI", bagian: "PACK R6" },
    { nip: "12019074572", nama: "ADI SUTOPO", bagian: "ALKALINE" },
    { nip: "12024064942", nama: "AGES RASYAD", bagian: "ALKALINE" },
    { nip: "12024054936", nama: "AGRIPA FLOBA", bagian: "ALKALINE" },
    { nip: "12022084837", nama: "AGUNG PRASETIO", bagian: "CELL FINISHING" },
    { nip: "11999062943", nama: "AGUNG PRIHANTORO", bagian: "ZS" },
    { nip: "11999032838", nama: "AGUS PRIYANTO", bagian: "ALKALINE" },
    { nip: "11996022429", nama: "AHMAD", bagian: "R20 H" },
    { nip: "12011063799", nama: "AHMAD KHOIRI", bagian: "R6-3" },
    { nip: "12012063982", nama: "AHMAD NUR ESA", bagian: "R6-3" },
    { nip: "12011093817", nama: "AHMAD REPAI", bagian: "R20-H" },
    { nip: "11994041888", nama: "AISYAROH", bagian: "PACK R6" },
    { nip: "12022064805", nama: "ALDI SAPUTRA", bagian: "BATTERY PACKING" },
    { nip: "12020114672", nama: "ALDIAT RUIKA", bagian: "KOMPONEN" },
    { nip: "12011123895", nama: "ALFA YANI", bagian: "PACK R6" },
    { nip: "12020014618", nama: "AMAD MURIDAN", bagian: "BM R20" },
    { nip: "11991081578", nama: "AMIT", bagian: "ALKALINE" },
    { nip: "11994112169", nama: "ANDAYANI", bagian: "ALKALINE" },
    { nip: "12011023777", nama: "ANDIKA FAKHIH SETIAJI", bagian: "KOMPONEN" },
    { nip: "12011113889", nama: "ANDRI WACONO", bagian: "ASS WORKSHOP" },
    { nip: "12020094653", nama: "ANDRIANTO WIBOWO", bagian: "BM R6" },
    { nip: "12011013715", nama: "ANDRIYAN", bagian: "ALKALINE" },
    { nip: "12011123896", nama: "ANI TRIANA", bagian: "ALKALINE" },
    { nip: "11999012793", nama: "ANIK ANDRAWATI", bagian: "PACK R6" },
    { nip: "11991071536", nama: "ANTIK SULASTRI", bagian: "HR" },
    { nip: "12011093863", nama: "ARDHI WIJAYANTI", bagian: "PACK R6" },
    { nip: "12000073009", nama: "ARI WIBOWO", bagian: "ALKALINE" },
    { nip: "12011103881", nama: "ARIES SETIAWAN", bagian: "ZC" },
    { nip: "12018094517", nama: "ARIF WAHYUDI", bagian: "KOMPONEN" },
    { nip: "11999072947", nama: "ARIP SUKAMTO", bagian: "ALKALINE" },
    { nip: "11996072518", nama: "ARIS", bagian: "ALKALINE" },
    { nip: "12009113579", nama: "ARIS TRIYONO", bagian: "BM R20" },
    { nip: "12011063797", nama: "ARIS WAHYUDI", bagian: "R6-1,2" },
    { nip: "11994082117", nama: "ARIYANTI", bagian: "PACKAGING R63" },
    { nip: "12011093824", nama: "ARIYANTO BUDI NUGROHO", bagian: "BM R6" },
    { nip: "11995052249", nama: "ASFIHANI", bagian: "PACK R6" },
    { nip: "11995092385", nama: "AYATI", bagian: "ALKALINE" },
    { nip: "11994082118", nama: "BAKTI HARYONO", bagian: "BC" },
    { nip: "11996042661", nama: "BAMBANG SUMANTRI", bagian: "GUDANG BARANG JADI" },
    { nip: "11999032871", nama: "BEJO UTOMO", bagian: "BM R20" },
    { nip: "12022074827", nama: "BERTRAM BRIAN", bagian: "BATTERY PACKING" },
    { nip: "12000073008", nama: "BUDI SETIAWAN", bagian: "ALKALINE" },
    { nip: "12012094048", nama: "BUDI YULIANI", bagian: "PACK R6" },
    { nip: "12006063373", nama: "CAHYAWATI", bagian: "ALKALINE" },
    { nip: "12011093825", nama: "CATUR YUDIANTO", bagian: "HR" },
    { nip: "11992041659", nama: "CHADIONO", bagian: "R03" },
    { nip: "11991091603", nama: "CUK HARYONO", bagian: "R20 H" },
    { nip: "11991081593", nama: "DARNI BIN TASMAN", bagian: "KOMPONEN" },
    { nip: "11992081766", nama: "DARTINI", bagian: "ALKALINE" },
    { nip: "12009113583", nama: "DEDI HERMANSYAH", bagian: "ASSEMBLY WORKSHOP" },
    { nip: "11995042209", nama: "DEDI SRI MULYANTO", bagian: "ALKALINE" },
    { nip: "12019074562", nama: "DEDY NUR ROMADHONI", bagian: "BM R6" },
    { nip: "12022084839", nama: "DENI SOFYAN", bagian: "BATTERY PACKING" },
    { nip: "11994082131", nama: "DESI ARYANTI", bagian: "R6-1,2" },
    { nip: "11995092360", nama: "DESMIWATI", bagian: "HR" },
    { nip: "12011063796", nama: "DIDI WAHYONO", bagian: "R6-3" },
    { nip: "12009113573", nama: "DIKA DANI YATI", bagian: "PACK R6" },
    { nip: "12022084842", nama: "DIMAS ARDIANSYAH", bagian: "BATTERY PACKING" },
    { nip: "12009113580", nama: "DIMAS NUGROHO PUTRANTO", bagian: "BM R20" },
    { nip: "11995052232", nama: "DINI NOVITA RAHAYU", bagian: "PACKAGING R6" },
    { nip: "12023024885", nama: "DJOKO SUTANTO", bagian: "PACKAGING R6" },
    { nip: "12011063810", nama: "DWI ARIFENDI", bagian: "ASS WORKSHOP" },
    { nip: "11991081586", nama: "DWI KUWATNI", bagian: "HR" },
    { nip: "12022074815", nama: "DWI RAMADHAN", bagian: "ALKALINE" },
    { nip: "11994112179", nama: "DWI SUMIATI", bagian: "PACK R6" },
    { nip: "11998122697", nama: "DWI WAHYULIATI", bagian: "PACK R6" },
    { nip: "11996072574", nama: "EDRIS ISKANDAR", bagian: "R03" },
    { nip: "12000073017", nama: "EKO KARYANTO", bagian: "ALKALINE" },
    { nip: "12011063795", nama: "EKO MUKHLISIN", bagian: "R6-3" },
    { nip: "12014084352", nama: "EKO NOVIANTO", bagian: "GUDANG BAHAN BAKU" },
    { nip: "11994112170", nama: "ELI HARTI", bagian: "HR" },
    { nip: "11992041644", nama: "ELI SUWASTI", bagian: "PACK R6" },
    { nip: "11995052252", nama: "ENDANG KUSNAENI", bagian: "PACK R6" },
    { nip: "12010043648", nama: "ERY ROHMAT WIDODO", bagian: "R03" },
    { nip: "11998122691", nama: "ESTI KHRISWINARTI", bagian: "PACK R6" },
    { nip: "12006063386", nama: "ETIK RAHAYU", bagian: "ALKALINE" },
    { nip: "11999072856", nama: "FACHATUN", bagian: "PACK R6" },
    { nip: "11998112717", nama: "FAHMI KADARUSMAN", bagian: "ALKALINE" },
    { nip: "12022084843", nama: "FAJAR WAHYU PRATAMA", bagian: "ALKALINE" },
    { nip: "11994082120", nama: "FARIDA ARSIANTI", bagian: "PACK R6" },
    { nip: "11999012735", nama: "FARMIATI", bagian: "PACK R6" },
    { nip: "12012114081", nama: "FITRI PUJI LESTARI", bagian: "R6-3" },
    { nip: "11991051483", nama: "GIYANTI", bagian: "HR" },
    { nip: "11992051698", nama: "GUMINTO", bagian: "KOMPONEN" },
    { nip: "11994041999", nama: "HADI KUSNO", bagian: "R20-H" },
    { nip: "11994072092", nama: "HARIYATI", bagian: "R03" },
    { nip: "11996102589", nama: "HARYANTO WD", bagian: "ALKALINE" },
    { nip: "11994041949", nama: "HARYONO", bagian: "R20-H" },
    { nip: "12020024626", nama: "HASBI RAMDHANI", bagian: "ALKALINE" },
    { nip: "12000052976", nama: "HENDRIYANI", bagian: "PACK R63" },
    { nip: "12009113566", nama: "HILDA", bagian: "PACK R6" },
    { nip: "11994041989", nama: "HINDUN HASANAH", bagian: "ALKALINE" },
    { nip: "11996012423", nama: "IMAM SANTOSO", bagian: "ALKALINE" },
    { nip: "12009113565", nama: "INDRASTI", bagian: "R03" },
    { nip: "12011093843", nama: "INDRI PUSPITA", bagian: "ALKALINE" },
    { nip: "12011113891", nama: "IRFAN ADI SAPUTRA", bagian: "KOMPONEN" },
    { nip: "12007043434", nama: "IRFAN AGUS SETIYONO", bagian: "ALKALINE" },
    { nip: "12006063385", nama: "IRMA", bagian: "ALKALINE" },
    { nip: "11990021389", nama: "IRWANTO", bagian: "BM R20" },
    { nip: "11992041645", nama: "ISMARWANTI", bagian: "HR" },
    { nip: "11998122702", nama: "ISMIYATI", bagian: "PACK R63" },
    { nip: "11998122675", nama: "ISNGAINI", bagian: "PACK R6" },
    { nip: "12024054931", nama: "IVAN JULIANSYAH", bagian: "ALKALINE" },
    { nip: "11992081762", nama: "JAINI PRIHATIN", bagian: "R03" },
    { nip: "12022034774", nama: "JAMALUDIN", bagian: "BC" },
    { nip: "12020074643", nama: "JOKO SANTOSO", bagian: "GUDANG BAHAN BAKU" },
    { nip: "11996072530", nama: "JUMALI", bagian: "R6-3" },
    { nip: "12011093844", nama: "JUMIATI", bagian: "R14" },
    { nip: "11992081775", nama: "JUMIYANTINI", bagian: "ALKALINE" },
    { nip: "11994041904", nama: "KAMINI", bagian: "PACK R6" },
    { nip: "11991061504", nama: "KARNI", bagian: "ALKALINE" },
    { nip: "11994112173", nama: "KARSIH", bagian: "R20 H" },
    { nip: "11992111799", nama: "KARYATI", bagian: "PACK R6" },
    { nip: "11994072094", nama: "KARYATI", bagian: "PACK R6" },
    { nip: "12019074568", nama: "KASAN SANTOSO", bagian: "ALKALINE" },
    { nip: "11992051700", nama: "KASIH", bagian: "ALKALINE" },
    { nip: "11994042002", nama: "KASIMAN", bagian: "BC" },
    { nip: "11994112177", nama: "KASIRAN", bagian: "R6-1,2" },
    { nip: "11995052273", nama: "KATINI", bagian: "R6-3" },
    { nip: "11994102165", nama: "KOMARIAH", bagian: "R6-1,2" },
    { nip: "11995052224", nama: "KOMARIAH", bagian: "ALKALINE" },
    { nip: "11992071710", nama: "KOMAWIDATI", bagian: "R6-1,,2" },
    { nip: "11999012799", nama: "KUSMIYATI", bagian: "PACK R6" },
    { nip: "12000052970", nama: "KUSWATI", bagian: "HR" },
    { nip: "11994041938", nama: "LATIFAH", bagian: "PACK R6" },
    { nip: "12011123900", nama: "LIMAR NUR SAFITRI", bagian: "PACK R6" },
    { nip: "12011093847", nama: "LINA DEWI PURWANINGSIH", bagian: "QC ALKALINE" },
    { nip: "11996072522", nama: "LISTIYANTO", bagian: "ALKALINE" },
    { nip: "11998122696", nama: "LUSI MARIYAMA", bagian: "PACK R6" },
    { nip: "12012073996", nama: "MAHRUL ROIS", bagian: "ASS WORKSHOP" },
    { nip: "12017074490", nama: "MANDOYO SULISTTIANTO", bagian: "BC" },
    { nip: "11991061497", nama: "MANIS", bagian: "R14" },
    { nip: "11998122676", nama: "MANISAH", bagian: "PACK R6" },
    { nip: "11998112746", nama: "MARGIONO", bagian: "ZS" },
    { nip: "11998112716", nama: "MARGIYONO", bagian: "ALKALINE" },
    { nip: "11996022435", nama: "MARGONO", bagian: "KOMPONEN" },
    { nip: "12000073015", nama: "MARIYADI", bagian: "ALKALINE" },
    { nip: "11995032195", nama: "MARIYANI", bagian: "ALKALINE" },
    { nip: "12009113578", nama: "MARJUNI", bagian: "R20-H" },
    { nip: "11994041896", nama: "MARKHAMAH", bagian: "ALKALINE" },
    { nip: "11990101432", nama: "MARNI", bagian: "PACK R6" },
    { nip: "11994082121", nama: "MARSINI", bagian: "PACKAGING R20" },
    { nip: "11994082122", nama: "MARTI", bagian: "HR" },
    { nip: "11992121817", nama: "MARYANI", bagian: "PACKAGING R6" },
    { nip: "11992071704", nama: "MARYATI", bagian: "HR" },
    { nip: "11999012730", nama: "MARYATI", bagian: "PACK R6" },
    { nip: "12019064558", nama: "MEGI SETIAWAN", bagian: "ALKALINE" },
    { nip: "11994052041", nama: "MIRAN", bagian: "BC" },
    { nip: "11994031886", nama: "MOHAMAD NUR ARIFIN", bagian: "ALKALINE" },
    { nip: "12022084857", nama: "MUCHAMAD ZALDI", bagian: "R6-3" },
    { nip: "11995102401", nama: "MUHAMAD NGABDANI", bagian: "BM R6" },
    { nip: "12014104365", nama: "MUHAMMAD SAKTI SWANDHANA", bagian: "ASS WORKSHOP" },
    { nip: "11994082156", nama: "MUJAROAH", bagian: "ALKALINE" },
    { nip: "11994082135", nama: "MUJINAH", bagian: "PACKAGING R6" },
    { nip: "11994072109", nama: "MUJIONO", bagian: "GUDANG BAHAN JADI" },
    { nip: "11994072110", nama: "MUKTASIM", bagian: "R20 H" },
    { nip: "11996062498", nama: "MULYADI", bagian: "R6-3" },
    { nip: "11994082136", nama: "MULYANI", bagian: "HR" },
    { nip: "11905052223", nama: "MULYANI", bagian: "R6-3" },
    { nip: "11992041664", nama: "MUNJAENAH", bagian: "HR" },
    { nip: "11990111457", nama: "MURNIATI", bagian: "PACK R6" },
    { nip: "11993021846", nama: "MURNINGSIH", bagian: "R6-1,2" },
    { nip: "11995062317", nama: "MURYANI", bagian: "PACK R20" },
    { nip: "11995092376", nama: "MUSLIKHAH", bagian: "PACK R20" },
    { nip: "12011093868", nama: "NANANG BUDI PRIYATIN", bagian: "ZS" },
    { nip: "12010103702", nama: "NANANG RUMINTO", bagian: "KOMPONEN" },
    { nip: "12013064205", nama: "NANDAR ISKANDAR", bagian: "BC" },
    { nip: "11992121819", nama: "NGADIYATI", bagian: "R6-1,2" },
    { nip: "11995092364", nama: "NGAISATUN", bagian: "PACK R6" },
    { nip: "11995052276", nama: "NINIK WINARSIH", bagian: "ALKALINE" },
    { nip: "12007033406", nama: "NIRBITO", bagian: "ZS" },
    { nip: "12014104364", nama: "NUR FAJAR SULAEMAN", bagian: "ASS WORKSHOP" },
    { nip: "11995082374", nama: "NURAENI", bagian: "PACKAGING R6" },
    { nip: "12000052965", nama: "NURHAYATI", bagian: "ALKALINE" },
    { nip: "12011093821", nama: "NURHUDA HERMANTO", bagian: "ALKALINE" },
    { nip: "11995062291", nama: "NURMALASARI", bagian: "PACK R6" },
    { nip: "12011123898", nama: "NURUL MUTMAINAH", bagian: "R03" },
    { nip: "11995052239", nama: "NURYANI", bagian: "HR" },
    { nip: "11999082883", nama: "NURYONO", bagian: "BATTERY PACKING" },
    { nip: "11994041908", nama: "PARJILAH", bagian: "PACK R6" },
    { nip: "11993011839", nama: "PARLAN", bagian: "R20-H" },
    { nip: "11996062499", nama: "PARMADI", bagian: "R6-3" },
    { nip: "11996022440", nama: "PARTIMIN", bagian: "R20 H" },
    { nip: "11999072858", nama: "PARTIYAH", bagian: "PACK R6" },
    { nip: "11999072861", nama: "PUJI LESTARI", bagian: "PACK R6" },
    { nip: "12006063389", nama: "PUPUT PRIHASTUTI", bagian: "ALKALINE" },
    { nip: "11999012775", nama: "PURWATI", bagian: "PACK R6" },
    { nip: "11999012796", nama: "RAFIKA", bagian: "PACK R6" },
    { nip: "12022084841", nama: "RAHMAD TAUFIK HIDAYAT", bagian: "ZS" },
    { nip: "11995052260", nama: "RAMINAH", bagian: "HR" },
    { nip: "11991081580", nama: "RATIYEM", bagian: "HR" },
    { nip: "11991091601", nama: "RETNO WINDARTI", bagian: "ALKALINE" },
    { nip: "12015044388", nama: "RIAN PRASTYO", bagian: "BM R6" },
    { nip: "12022084833", nama: "RIO RIANO ALFARIZI", bagian: "BATERY PACKING" },
    { nip: "12009113600", nama: "RISA MIRANTI", bagian: "PACK R6" },
    { nip: "11991081575", nama: "RISTATI", bagian: "ALKALINE" },
    { nip: "12009113574", nama: "RIYAN ARYANTI", bagian: "PACK R6" },
    { nip: "12009113599", nama: "ROFINGATUN", bagian: "R03" },
    { nip: "11995062292", nama: "ROFIQHADATUL WAHAB", bagian: "ALKALINE" },
    { nip: "11999072865", nama: "ROM SETIYONINGSIH", bagian: "ALKALINE" },
    { nip: "11999012812", nama: "ROMADI", bagian: "PACK R6" },
    { nip: "11991041476", nama: "ROZIKIN", bagian: "R20H" },
    { nip: "12021084739", nama: "RUDIANTO", bagian: "GUDANG BAHAN BAKU" },
    { nip: "11994042008", nama: "RUSMIYATI", bagian: "PACKAGING R6" },
    { nip: "11994042009", nama: "RUSNI", bagian: "PACK R6" },
    { nip: "12022094864", nama: "SABARUDIN MUSTHOFA", bagian: "ALKALINE" },
    { nip: "11994052063", nama: "SAMIDI SLAMET", bagian: "R20 H" },
    { nip: "11991061490", nama: "SAMINI", bagian: "ALKALINE" },
    { nip: "11996022442", nama: "SANDRA KOSASI", bagian: "GUDANG BAHAN BAKU" },
    { nip: "11995052262", nama: "SANTI SUGIARTI", bagian: "ALKALINE" },
    { nip: "11994052072", nama: "SARINO", bagian: "R20H" },
    { nip: "11991111615", nama: "SARMI", bagian: "ALKALINE" },
    { nip: "11995042214", nama: "SATINI", bagian: "ALKALINE" },
    { nip: "12009113589", nama: "SEPTI NURLAELI", bagian: "HR" },
    { nip: "11992041681", nama: "SETIATI", bagian: "HR" },
    { nip: "11995092387", nama: "SETYATUN", bagian: "PACK R20" },
    { nip: "12007013414", nama: "SETYO WAHYONO", bagian: "ALKALINE" },
    { nip: "12019064559", nama: "SIGIT NURAZIS", bagian: "ALKALINE" },
    { nip: "12000073010", nama: "SINARYO", bagian: "ALKALINE" },
    { nip: "12001063081", nama: "SISKA WAHYUNINGSIH", bagian: "ALKALINE" },
    { nip: "11998122671", nama: "SITI FATIMAH", bagian: "PACK R6" },
    { nip: "11991071558", nama: "SITI HINDUN", bagian: "PACK R6" },
    { nip: "11999012778", nama: "SITI KARMILAH", bagian: "GA" },
    { nip: "11995052269", nama: "SITI KHALIMAH YULIA", bagian: "ALKALINE" },
    { nip: "11995052242", nama: "SITI MULYANI", bagian: "HR" },
    { nip: "12011123897", nama: "SITI RAHMAWATI", bagian: "HR" },
    { nip: "11994042021", nama: "SITI ROBINGAH", bagian: "PACK R6" },
    { nip: "11999072854", nama: "SITI ROKHANAH", bagian: "PACKAGING R6" },
    { nip: "12011093856", nama: "SITI SOPIAH", bagian: "ALKALINE" },
    { nip: "11994041914", nama: "SLAMET", bagian: "KOMPONEN" },
    { nip: "11993051862", nama: "SLAMET", bagian: "R20S/R14" },
    { nip: "11996022444", nama: "SLAMET HARYANTO", bagian: "ALKALINE" },
    { nip: "12000022984", nama: "SOFYAN SYAH", bagian: "ALKALINE" },
    { nip: "11994041963", nama: "SOLEKHATUN", bagian: "PACK R6" },
    { nip: "11991061516", nama: "SOLIKAH", bagian: "HR" },
    { nip: "12000052977", nama: "SRI ANDAYANI", bagian: "R6 3" },
    { nip: "11990111460", nama: "SRI DARIYAH", bagian: "ALKALINE" },
    { nip: "11990441915", nama: "SRI ENDANG HEROWATI", bagian: "ALKALINE" },
    { nip: "11999072887", nama: "SRI HANDAYANINGSIH", bagian: "PACK R6" },
    { nip: "11995052225", nama: "SRI HANDAYATI BT KUSRAL", bagian: "PACK R6" },
    { nip: "11994041916", nama: "SRI HARYANI", bagian: "R6 3" },
    { nip: "11994041964", nama: "SRI HARYANTI", bagian: "R6 3" },
    { nip: "12006263382", nama: "SRI JAMANGATIN", bagian: "ALKALINE" },
    { nip: "11992071727", nama: "SRI MURYATI", bagian: "R6 1,2" },
    { nip: "12011093828", nama: "SRI PRIHATIN", bagian: "PACK R6" },
    { nip: "11998122688", nama: "SRI RAHAYU", bagian: "QC CZ" },
    { nip: "11990101441", nama: "SRI RAHAYU", bagian: "PACKAGING R6" },
    { nip: "11995062309", nama: "SRI SUCIATI", bagian: "ALKALINE" },
    { nip: "12006063383", nama: "SRI SUKENTI", bagian: "QC CZ" },
    { nip: "11999072886", nama: "SRI SULASMI", bagian: "R6-1,2" },
    { nip: "11999012741", nama: "SRI WAHYUNI", bagian: "ALKALINE" },
    { nip: "11995092368", nama: "SRI WAHYUNI", bagian: "KOMPONEN" },
    { nip: "11999012771", nama: "SRI WAHYUNI", bagian: "ALKALINE" },
    { nip: "11998022669", nama: "SRI WAHYUNINGSIH", bagian: "R20H" },
    { nip: "12011123894", nama: "SRI WAHYUNINGSIH", bagian: "R03" },
    { nip: "12006013291", nama: "SRI WIDODO", bagian: "ALKALINE" },
    { nip: "11996102582", nama: "SRI YONO", bagian: "R6 1,2" },
    { nip: "11991061510", nama: "SRINI RUBIATI", bagian: "HR" },
    { nip: "12019074567", nama: "SUBUR PRASETYO", bagian: "ALKALINE" },
    { nip: "11995052219", nama: "SUCIPTO", bagian: "R6-1,2" },
    { nip: "11995052265", nama: "SUDARMI", bagian: "PACK R6" },
    { nip: "11992041671", nama: "SUDARSIH", bagian: "R03" },
    { nip: "11994072100", nama: "SUDARTI", bagian: "PACKAGING R6" },
    { nip: "11992111806", nama: "SUDRAJAT", bagian: "KOMPONEN" },
    { nip: "11991081589", nama: "SUFINATUN", bagian: "R20 S/R14" },
    { nip: "11994102167", nama: "SUGIATI", bagian: "GA" },
    { nip: "11991061523", nama: "SUGINEM", bagian: "ALKALINE" },
    { nip: "11999012734", nama: "SUGIYANTI", bagian: "PACK R6" },
    { nip: "12000052968", nama: "SUGIYASIH", bagian: "ALKALINE" },
    { nip: "11998122706", nama: "SUHARYANTI", bagian: "PACK R6" },
    { nip: "11998112690", nama: "SUHERNI", bagian: "ALKALINE" },
    { nip: "11992081769", nama: "SUKAMSI", bagian: "BATTERY PACKING" },
    { nip: "11990111463", nama: "SUKARNI", bagian: "R6 1,2" },
    { nip: "11994041967", nama: "SUKARTI", bagian: "ALKALINE" },
    { nip: "11992071731", nama: "SUKARTI", bagian: "PACKAGING R6" },
    { nip: "11994041920", nama: "SUKATMININGSIH", bagian: "ALKALINE" },
    { nip: "11994041969", nama: "SUKIMAN", bagian: "R20H" },
    { nip: "11999112957", nama: "SUKMA WIGUNA", bagian: "GA" },
    { nip: "11992041663", nama: "SULASTRI", bagian: "R03" },
    { nip: "11992121824", nama: "SULASTRI", bagian: "ALKALINE" },
    { nip: "11994041970", nama: "SULASTRI", bagian: "PACK R6" },
    { nip: "12009113562", nama: "SULISTIANINGSIH", bagian: "PACK R6" },
    { nip: "12000022996", nama: "SULISWANTI", bagian: "R20S/R14" },
    { nip: "11992071750", nama: "SUMARMI", bagian: "PACK R6" },
    { nip: "11995062322", nama: "SUMARSIH", bagian: "PACK R6" },
    { nip: "11990101424", nama: "SUMARYANTI", bagian: "R6 1,2" },
    { nip: "11992021624", nama: "SUMIATI", bagian: "PACK R6" },
    { nip: "11995052266", nama: "SUMIATI", bagian: "PACK R6" },
    { nip: "11994041899", nama: "SUMINI", bagian: "R03" },
    { nip: "11994041973", nama: "SUMIRAH", bagian: "PACK R6" },
    { nip: "11994042024", nama: "SUMIYARSIH", bagian: "ALKALINE" },
    { nip: "11992041685", nama: "SUMIYATI", bagian: "HR" },
    { nip: "12000052971", nama: "SUNARNI", bagian: "ALKALINE" },
    { nip: "11990101444", nama: "SUNARTI", bagian: "PACK R6" },
    { nip: "11992071753", nama: "SUNARTI", bagian: "ALKALINE" },
    { nip: "11996062508", nama: "SUNOTO", bagian: "R20 H" },
    { nip: "11992111811", nama: "SUPANTO", bagian: "BM R6" },
    { nip: "11994072113", nama: "SUPARDI", bagian: "KOMPONEN" },
    { nip: "12000052992", nama: "SUPARMI", bagian: "ALKALINE" },
    { nip: "11991081577", nama: "SUPARNI", bagian: "R6 1,2" },
    { nip: "11995062323", nama: "SUPARTIN", bagian: "HR" },
    { nip: "11995082349", nama: "SUPILAH", bagian: "PACKAGING R6" },
    { nip: "11995092370", nama: "SUPRAPTI", bagian: "PACK R6" },
    { nip: "11991071561", nama: "SUPRAPTO", bagian: "R6 1,2" },
    { nip: "11995052280", nama: "SUPRIATI TRI REJEKI", bagian: "R20H" },
    { nip: "11992071721", nama: "SUPRIYATI", bagian: "HR" },
    { nip: "11998122672", nama: "SURASMINI", bagian: "R6 3" },
    { nip: "11994072089", nama: "SURATINI", bagian: "ALKALINE" },
    { nip: "11991091597", nama: "SURATMI", bagian: "ALKALINE" },
    { nip: "11992071716", nama: "SURATMI", bagian: "PACKAGING R6" },
    { nip: "11995062311", nama: "SURATNO", bagian: "BC" },
    { nip: "12011063801", nama: "SUROSO", bagian: "R6 3" },
    { nip: "11990021392", nama: "SUROTO", bagian: "GUDANG BAHAN BAKU" },
    { nip: "11999012750", nama: "SURYANI", bagian: "R6 3" },
    { nip: "11998122686", nama: "SUSILOWATI", bagian: "PACK R6" },
    { nip: "12006013290", nama: "SUTANTRI", bagian: "ALKALINE" },
    { nip: "11992021628", nama: "SUTARMI", bagian: "HR" },
    { nip: "11992041686", nama: "SUTATIK", bagian: "ALKALINE" },
    { nip: "11994041986", nama: "SUTINEM", bagian: "ALKALINE" },
    { nip: "11992081756", nama: "SUTIRAH", bagian: "PACK R6" },
    { nip: "11999012780", nama: "SUTIRAH", bagian: "PACK R6" },
    { nip: "11994041924", nama: "SUTIRAH", bagian: "R20 H" },
    { nip: "11990101445", nama: "SUTIYANI", bagian: "PACKAGING R6" },
    { nip: "11994041976", nama: "SUTOYO", bagian: "R20 H" },
    { nip: "11995042206", nama: "SUWAR", bagian: "R6 1,2" },
    { nip: "11995062325", nama: "SUWARDI", bagian: "KOMPONEN" },
    { nip: "11994042026", nama: "SUWARNO", bagian: "R20 H" },
    { nip: "11993041859", nama: "SUWONO", bagian: "PACK R20" },
    { nip: "11990101446", nama: "SUYATI", bagian: "R03" },
    { nip: "11993021849", nama: "SUYONO", bagian: "BM R20" },
    { nip: "11995082342", nama: "SYAEUN", bagian: "GUDANG BAHAN BAKU" },
    { nip: "12015094412", nama: "TAUFIK HIDAYAT", bagian: "GUDANG BARANG JADI" },
    { nip: "11999032872", nama: "TEGUH FITRIYANTO", bagian: "ES" },
    { nip: "12000052978", nama: "TITIK KURNIAWATI", bagian: "ALKALINE" },
    { nip: "11999072888", nama: "TITIK SRI WIDAYATI", bagian: "R6 1,2" },
    { nip: "12011093860", nama: "TITIN WAHYUNI", bagian: "R20H" },
    { nip: "11996102583", nama: "TOHARI", bagian: "ALKALINE" },
    { nip: "11994041928", nama: "TONENI", bagian: "HR" },
    { nip: "12014084340", nama: "TRI BUDIONO", bagian: "GUDANG BAHAN BAKU" },
    { nip: "11998122699", nama: "TRI HARSINI", bagian: "R03" },
    { nip: "11994041996", nama: "TRI LUTIANINGSIH", bagian: "PACKAGING R6" },
    { nip: "12006063387", nama: "TRI MARDIYANTI", bagian: "QC ALKALINE" },
    { nip: "12007013413", nama: "TRI MUGIANTO", bagian: "ALKALINE" },
    { nip: "12011023717", nama: "TRI SUTRISNO", bagian: "ZS" },
    { nip: "12022084855", nama: "TRI WAHYUDI", bagian: "R20S/R14" },
    { nip: "11992021633", nama: "TRI WIYATUN", bagian: "R6 3" },
    { nip: "11994052058", nama: "TRISNAENI", bagian: "PACKAGING R6" },
    { nip: "11994041997", nama: "TRIYANTI", bagian: "R20 H" },
    { nip: "12007073473", nama: "TRIYONO", bagian: "ALKALINE" },
    { nip: "11996062503", nama: "TRIYONO", bagian: "R6-3" },
    { nip: "11994052074", nama: "TUMISIH", bagian: "PACK R6" },
    { nip: "11991091598", nama: "TUMISIH", bagian: "ALKALINE" },
    { nip: "11994052075", nama: "TURUT", bagian: "GUDANG BAHAN BAKU" },
    { nip: "11994082160", nama: "TUTIK SURYANI", bagian: "PACK R6" },
    { nip: "11994052065", nama: "UDI HARTONO", bagian: "BC" },
    { nip: "11994042012", nama: "UNTUNG HARYONO", bagian: "ZC" },
    { nip: "11994041930", nama: "UTAMI DEWI", bagian: "R20H" },
    { nip: "12019084582", nama: "VIRGIAWAN DONA PRATAMA", bagian: "UTILITY" },
    { nip: "12021024699", nama: "WAFA ALWAN FAUZI", bagian: "TEI" },
    { nip: "11995032200", nama: "WAGIHARTI", bagian: "HR" },
    { nip: "11992071734", nama: "WAGIMAN", bagian: "ASS WORKSHOP" },
    { nip: "11992101783", nama: "WAGINTEN", bagian: "R6 1,2" },
    { nip: "12014094355", nama: "WAHYU AGUNG WIBOWO", bagian: "R20S/R14" },
    { nip: "11998122722", nama: "WAHYUNI", bagian: "PACK R6" },
    { nip: "11993051861", nama: "WAKHIDUN", bagian: "BM R20" },
    { nip: "11994041931", nama: "WANTIYAH", bagian: "ALKALINE" },
    { nip: "11996032460", nama: "WARJONO", bagian: "ALKALINE" },
    { nip: "11991081583", nama: "WARSINI", bagian: "PACK R6" },
    { nip: "11999012794", nama: "WARSINI", bagian: "PACK R6" },
    { nip: "11994082147", nama: "WARTINI", bagian: "PACKAGING R6" },
    { nip: "11995092384", nama: "WARYANTI", bagian: "ALKALINE" },
    { nip: "11993051865", nama: "WATAMTO", bagian: "BC" },
    { nip: "11995102411", nama: "WATONO", bagian: "BM R6" },
    { nip: "11994072104", nama: "WIDARTI", bagian: "PACK R6" },
    { nip: "12011063802", nama: "WIDI SETIAWAN", bagian: "KOMPONEN" },
    { nip: "12012033935", nama: "WIDIYANINGSIH", bagian: "QC CZ" },
    { nip: "12013074212", nama: "WIJAYA KUSUMA", bagian: "R03" },
    { nip: "11995092371", nama: "WINARSIH", bagian: "ALKALINE" },
    { nip: "12012124106", nama: "WINDA LISNAWATY", bagian: "QC CZ" },
    { nip: "12011093863", nama: "WISMAWATI", bagian: "ALKALINE" },
    { nip: "11999012781", nama: "WIWIN SULASTRI", bagian: "PACK R20" },
    { nip: "11994042037", nama: "YAENAL ARIFIN", bagian: "R20 H" },
    { nip: "11999072851", nama: "YATINI", bagian: "PACK R6" },
    { nip: "12012074006", nama: "YOGA SURYONO", bagian: "GUDANG BAHAN BAKU" },
    { nip: "11999072853", nama: "YULIA NINGSIH", bagian: "PACK R6" },
    { nip: "11999012743", nama: "YULIANTI", bagian: "QC CZ" },
    { nip: "12021014687", nama: "YUSUF RIZAL ABDUL AZIZ", bagian: "R6 1,2" }
];

// ============================================================
// DATA VARIABLES
// ============================================================
let masterPeserta = [];
let antrian = [];
let nomorTerakhir = 0;
let selectedIndex = { nip: -1, nama: -1, bagian: -1 };
let filteredData = { nip: [], nama: [], bagian: [] };

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMessage');
    toast.className = 'toast ' + type;
    msg.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================================
// FORMAT TANGGAL & WAKTU
// ============================================================
function formatTanggalWaktu() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const tanggal = now.toLocaleDateString('id-ID', options);
    const waktu = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    return { tanggal, waktu };
}

// ============================================================
// DATABASE STATUS
// ============================================================
function updateDatabaseStatus() {
    const dbCount = document.getElementById('dbCount');
    const dbInfo = document.getElementById('dbInfo');
    if (dbCount) dbCount.textContent = masterPeserta.length;
    if (dbInfo) {
        if (masterPeserta.length > 0) {
            dbInfo.textContent = '✅ Siap digunakan';
            dbInfo.style.color = '#059669';
        } else {
            dbInfo.textContent = '⚠️ Belum ada data, import Excel!';
            dbInfo.style.color = '#dc2626';
        }
    }
}

// ============================================================
// AUTOCOMPLETE
// ============================================================
function filterAutocomplete(field, query) {
    const listMap = {
        nip: 'listNip',
        nama: 'listNama',
        bagian: 'listBagian'
    };
    const list = document.getElementById(listMap[field]);
    const inputId = 'input' + field.charAt(0).toUpperCase() + field.slice(1);
    const input = document.getElementById(inputId);

    if (!query || query.trim().length === 0) {
        list.classList.remove('show');
        list.innerHTML = '';
        if (input) input.classList.remove('highlight');
        filteredData[field] = [];
        selectedIndex[field] = -1;
        return;
    }

    const q = query.toLowerCase().trim();
    let data = [];

    if (field === 'nip') {
        data = masterPeserta.filter(p => p.nip && p.nip.toLowerCase().includes(q));
    } else if (field === 'nama') {
        data = masterPeserta.filter(p => p.nama && p.nama.toLowerCase().includes(q));
    } else if (field === 'bagian') {
        const uniqueBagian = [...new Set(
            masterPeserta
                .map(p => p.bagian)
                .filter(b => b && b.toLowerCase().includes(q))
        )];
        data = uniqueBagian.map(b => ({ bagian: b }));
        const exists = data.some(d => d.bagian.toLowerCase() === q);
        if (!exists && q.length > 0) {
            data.push({ bagian: q, isNew: true });
        }
    }

    if (data.length === 0 && masterPeserta.length === 0) {
        list.innerHTML = `<div class="autocomplete-empty">📂 Import database Excel terlebih dahulu</div>`;
        list.classList.add('show');
        return;
    }

    if (data.length === 0) {
        list.innerHTML = `<div class="autocomplete-empty">😕 Tidak ditemukan di database</div>`;
        list.classList.add('show');
        return;
    }

    data = data.slice(0, 10);
    filteredData[field] = data;
    selectedIndex[field] = -1;

    let html = '';
    data.forEach((p, idx) => {
        let display = '',
            sub = '',
            badge = '',
            isNewClass = '';

        if (field === 'nip') {
            display = p.nip;
            sub = p.nama || '-';
            badge = p.bagian || 'Karyawan';
            const qLower = q.toLowerCase();
            if (p.nip.toLowerCase().includes(qLower)) {
                const start = p.nip.toLowerCase().indexOf(qLower);
                const end = start + q.length;
                display = p.nip.substring(0, start) +
                    `<span class="highlight">${p.nip.substring(start, end)}</span>` +
                    p.nip.substring(end);
            }
        } else if (field === 'nama') {
            display = p.nama;
            sub = p.nip || '-';
            badge = p.bagian || 'Karyawan';
            const qLower = q.toLowerCase();
            if (p.nama.toLowerCase().includes(qLower)) {
                const start = p.nama.toLowerCase().indexOf(qLower);
                const end = start + q.length;
                display = p.nama.substring(0, start) +
                    `<span class="highlight">${p.nama.substring(start, end)}</span>` +
                    p.nama.substring(end);
            }
        } else if (field === 'bagian') {
            display = p.bagian;
            sub = p.isNew ? 'Bagian baru' : 'Klik untuk memilih';
            badge = p.isNew ? 'Baru' : '';
            isNewClass = p.isNew ? 'is-new' : '';
            const qLower = q.toLowerCase();
            if (p.bagian.toLowerCase().includes(qLower)) {
                const start = p.bagian.toLowerCase().indexOf(qLower);
                const end = start + q.length;
                display = p.bagian.substring(0, start) +
                    `<span class="highlight">${p.bagian.substring(start, end)}</span>` +
                    p.bagian.substring(end);
            }
        }

        html += `
                <div class="autocomplete-item ${isNewClass}" data-index="${idx}" onclick="selectPeserta('${field}', ${idx})">
                    <div>
                        <div class="main">${display}</div>
                        ${sub ? `<div class="sub">${sub}</div>` : ''}
                    </div>
                    ${badge ? `<span class="badge-info" style="${p.isNew ? 'background:#059669;color:white;' : ''}">${badge}</span>` : ''}
                </div>
            `;
    });

    list.innerHTML = html;
    list.classList.add('show');
    if (input) input.classList.add('highlight');
}

function selectPeserta(field, index) {
    const data = filteredData[field];
    if (!data || !data[index]) return;
    const p = data[index];

    if (field === 'nip') {
        document.getElementById('inputNip').value = p.nip;
        document.getElementById('inputNama').value = p.nama || '';
        document.getElementById('inputBagian').value = p.bagian || '';
        closeAllLists();
    } else if (field === 'nama') {
        document.getElementById('inputNip').value = p.nip || '';
        document.getElementById('inputNama').value = p.nama;
        document.getElementById('inputBagian').value = p.bagian || '';
        closeAllLists();
    } else if (field === 'bagian') {
        document.getElementById('inputBagian').value = p.bagian;
        closeAllLists();
        document.getElementById('inputNip').focus();
    }
    document.querySelectorAll('.autocomplete-input').forEach(el => el.classList.remove('highlight'));
}

function handleKeydown(field, e) {
    const listMap = {
        nip: 'listNip',
        nama: 'listNama',
        bagian: 'listBagian'
    };
    const list = document.getElementById(listMap[field]);
    const items = list.querySelectorAll('.autocomplete-item');

    if (!list.classList.contains('show')) {
        if (e.key === 'Enter') {
            e.preventDefault();
            ambilAntrian();
        }
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length > 0) {
            selectedIndex[field] = (selectedIndex[field] + 1) % items.length;
            highlightItem(items, selectedIndex[field]);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length > 0) {
            selectedIndex[field] = (selectedIndex[field] - 1 + items.length) % items.length;
            highlightItem(items, selectedIndex[field]);
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex[field] >= 0 && selectedIndex[field] < items.length) {
            items[selectedIndex[field]].click();
        } else if (filteredData[field] && filteredData[field].length === 1) {
            selectPeserta(field, 0);
        } else {
            ambilAntrian();
        }
    } else if (e.key === 'Escape') {
        list.classList.remove('show');
        list.innerHTML = '';
        document.querySelectorAll('.autocomplete-input').forEach(el => el.classList.remove('highlight'));
        filteredData[field] = [];
        selectedIndex[field] = -1;
    }
}

function highlightItem(items, index) {
    items.forEach((item, idx) => {
        item.style.background = idx === index ? '#dbeafe' : '';
    });
    if (index >= 0 && index < items.length) {
        items[index].scrollIntoView({ block: 'nearest' });
    }
}

function closeAllLists() {
    document.querySelectorAll('.autocomplete-list').forEach(el => {
        el.classList.remove('show');
        el.innerHTML = '';
    });
    document.querySelectorAll('.autocomplete-input').forEach(el => el.classList.remove('highlight'));
    filteredData = { nip: [], nama: [], bagian: [] };
    selectedIndex = { nip: -1, nama: -1, bagian: -1 };
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container')) {
        closeAllLists();
    }
});

// ============================================================
// AMBIL ANTRIAN
// ============================================================
function ambilAntrian() {
    const nip = document.getElementById('inputNip').value.trim();
    const nama = document.getElementById('inputNama').value.trim();
    const bagian = document.getElementById('inputBagian').value.trim();

    if (!nip || !nama || !bagian) {
        showToast('⚠️ NIP, Nama, dan Bagian harus diisi!', 'error');
        return;
    }

    const cek = antrian.find(a => a.nip === nip);
    if (cek) {
        showToast(`⚠️ "${nama}" sudah terdaftar dengan nomor ${cek.nomor}`, 'error');
        clearForm();
        return;
    }

    const found = masterPeserta.find(p => p.nip === nip);
    if (found) {
        found.nama = nama;
        found.bagian = bagian;
        simpanSuggestionKeLocalStorage();
    }

    nomorTerakhir++;
    const nomorBaru = String(nomorTerakhir).padStart(3, '0');

    antrian.push({ nip, nama, bagian, nomor: nomorBaru });
    renderTabel();

    const { tanggal, waktu } = formatTanggalWaktu();
    document.getElementById('nomorAntrian').textContent = nomorBaru;
    document.getElementById('detailAntrian').innerHTML = `<strong>${nama}</strong> · ${bagian}`;
    document.getElementById('tanggalAmbil').textContent = tanggal;
    document.getElementById('waktuAmbil').textContent = waktu;
    document.getElementById('ticket').classList.add('show');

    clearForm();
    simpanKeLocalStorage();
    syncToFirebase();
    showToast(`🎫 Nomor ${nomorBaru} untuk ${nama}`, 'success');
}

// ============================================================
// CLEAR FORM
// ============================================================
function clearForm() {
    document.getElementById('inputNip').value = '';
    document.getElementById('inputNama').value = '';
    document.getElementById('inputBagian').value = '';
    closeAllLists();
    document.getElementById('inputNip').focus();
}

// ============================================================
// TAMBAH PESERTA (Admin Only)
// ============================================================
function tambahPeserta() {
    const nip = prompt('Masukkan NIP:');
    if (nip === null) return;
    if (!nip.trim()) {
        showToast('⚠️ NIP harus diisi!', 'error');
        return;
    }
    const nama = prompt('Masukkan Nama:');
    if (nama === null) return;
    if (!nama.trim()) {
        showToast('⚠️ Nama harus diisi!', 'error');
        return;
    }
    const bagian = prompt('Masukkan Bagian:', 'Karyawan') || 'Karyawan';

    if (masterPeserta.some(p => p.nip === nip.trim())) {
        showToast('⚠️ NIP sudah terdaftar!', 'error');
        return;
    }

    masterPeserta.push({ nip: nip.trim(), nama: nama.trim(), bagian: bagian.trim() });
    simpanSuggestionKeLocalStorage();
    syncToFirebase();
    updateDatabaseStatus();
    showToast(`✅ Peserta "${nama.trim()}" ditambahkan`, 'success');
}

// ============================================================
// IMPORT DATA (Admin Only)
// ============================================================
// ============================================================
// IMPORT DATA - FIX UNTUK EXCEL DENGAN JUDUL
// ============================================================
function importData(event) {
    const file = event.target.files[0];
    if (!file) {
        showToast('⚠️ Pilih file terlebih dahulu!', 'error');
        return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        showToast('⚠️ Format file harus .xlsx, .xls, atau .csv', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // 🔥 FIX: Baca data dengan range mulai dari baris 6 (setelah judul)
            // Atau cari header yang mengandung "NO NIP"
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                header: 1,  // Baca sebagai array
                defval: ''  // Default value untuk cell kosong
            });

            // 🔥 Cari baris header (yang mengandung "NO NIP" atau "NIP")
            let headerRowIndex = -1;
            let dataStartIndex = -1;

            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;
                
                // Cek apakah baris ini adalah header
                const rowStr = row.join(' ').toUpperCase();
                if (rowStr.includes('NO NIP') || rowStr.includes('NIP') || rowStr.includes('NAMA')) {
                    headerRowIndex = i;
                    dataStartIndex = i + 1;
                    break;
                }
            }

            if (headerRowIndex === -1 || dataStartIndex === -1) {
                showToast('⚠️ Tidak menemukan header (NO NIP / NAMA / BAGIAN)', 'error');
                return;
            }

            // 🔥 Ambil header
            const headerRow = jsonData[headerRowIndex];
            const headerMap = {};
            headerRow.forEach((col, idx) => {
                const colStr = String(col).toUpperCase().trim();
                if (colStr.includes('NIP') || colStr.includes('NO')) {
                    headerMap['nip'] = idx;
                } else if (colStr.includes('NAMA')) {
                    headerMap['nama'] = idx;
                } else if (colStr.includes('BAGIAN') || colStr.includes('DEPART')) {
                    headerMap['bagian'] = idx;
                }
            });

            console.log('📊 Header ditemukan di baris:', headerRowIndex + 1);
            console.log('📊 Header map:', headerMap);
            console.log('📊 Header row:', headerRow);

            // 🔥 Ambil data dari baris setelah header
            const dataRows = jsonData.slice(dataStartIndex);
            
            // Filter baris kosong
            const validRows = dataRows.filter(row => {
                const nip = row[headerMap['nip']] || '';
                const nama = row[headerMap['nama']] || '';
                return String(nip).trim() && String(nama).trim();
            });

            console.log('📊 Total data valid:', validRows.length);

            if (validRows.length === 0) {
                showToast('⚠️ Tidak ada data valid di Excel!', 'error');
                return;
            }

            // 🔥 Preview ke user
            let preview = `📊 ${validRows.length} data ditemukan\n\n`;
            preview += `📌 Header: ${headerRow.join(' | ')}\n\n`;
            preview += `📌 3 Data Pertama:\n`;
            validRows.slice(0, 3).forEach((row, i) => {
                const nip = row[headerMap['nip']] || '';
                const nama = row[headerMap['nama']] || '';
                const bagian = row[headerMap['bagian']] || 'Karyawan';
                preview += `${i+1}. ${nip} | ${nama} | ${bagian}\n`;
            });
            
            if (!confirm(`${preview}\n\nLanjutkan import?`)) {
                event.target.value = '';
                return;
            }

            // 🔥 Reset dan import
            let imported = 0;
            let duplicate = 0;

            validRows.forEach(row => {
                const nip = String(row[headerMap['nip']] || '').trim();
                const nama = String(row[headerMap['nama']] || '').trim();
                const bagian = String(row[headerMap['bagian']] || 'Karyawan').trim();

                if (nip && nama) {
                    const exists = masterPeserta.some(p => p.nip === nip);
                    if (!exists) {
                        masterPeserta.push({
                            nip: nip,
                            nama: nama,
                            bagian: bagian || 'Karyawan'
                        });
                        imported++;
                    } else {
                        duplicate++;
                    }
                }
            });

            // Simpan
            simpanSuggestionKeLocalStorage();
            syncToFirebase();
            updateDatabaseStatus();
            renderTabel();
            
            event.target.value = '';

            let message = `✅ Import ${imported} peserta`;
            if (duplicate > 0) {
                message += `, ${duplicate} duplikat diabaikan`;
            }
            showToast(message, imported > 0 ? 'success' : 'info');
            
            console.log('✅ Import selesai:', { imported, duplicate, total: validRows.length });

        } catch (error) {
            console.error('❌ Error:', error);
            showToast('⚠️ Gagal membaca file: ' + error.message, 'error');
            event.target.value = '';
        }
    };

    reader.onerror = function() {
        showToast('⚠️ Gagal membaca file!', 'error');
        event.target.value = '';
    };

    reader.readAsArrayBuffer(file);
}

// ============================================================
// RENDER TABEL
// ============================================================
function renderTabel() {
    const tbody = document.getElementById('tbodyAntrian');
    const count = document.getElementById('countAntrian');
    count.textContent = antrian.length + ' antrian';

    if (antrian.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-inbox"></i>Belum ada antrian</div></td></tr>`;
        return;
    }

    let html = '';
    antrian.forEach((a, idx) => {
        html += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${a.nip}</td>
                    <td>${a.nama}</td>
                    <td>${a.bagian}</td>
                    <td class="nomor-cell">${a.nomor}</td>
                    <td>
                        <button class="btn-delete" onclick="hapusAntrian('${a.nip}')" title="Hapus antrian">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
    });
    tbody.innerHTML = html;
}

// ============================================================
// HAPUS ANTRIAN (Admin Only)
// ============================================================
function hapusAntrian(nip) {
    const peserta = antrian.find(a => a.nip === nip);
    if (!peserta) return;
    if (!confirm(`Hapus antrian "${peserta.nama}"?`)) return;

    antrian = antrian.filter(a => a.nip !== nip);
    antrian.forEach((a, idx) => a.nomor = String(idx + 1).padStart(3, '0'));
    nomorTerakhir = antrian.length;

    renderTabel();
    if (antrian.length === 0) document.getElementById('ticket').classList.remove('show');
    simpanKeLocalStorage();
    syncToFirebase();
    showToast(`🗑️ Antrian "${peserta.nama}" dihapus`, 'info');
}

// ============================================================
// SAVE EXCEL (Admin Only)
// ============================================================
function saveExcel() {
    if (antrian.length === 0) {
        showToast('⚠️ Belum ada data antrian', 'error');
        return;
    }
    const dataForExcel = [
        ['#', 'NIP', 'Nama', 'Bagian', 'Nomor Antrian']
    ];
    antrian.forEach((a, i) => dataForExcel.push([i + 1, a.nip, a.nama, a.bagian, a.nomor]));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataForExcel);
    ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Antrian");
    XLSX.writeFile(wb, `Antrian_KPJ_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('📥 File Excel berhasil didownload!', 'success');
}

// ============================================================
// RESET ALL (Admin Only)
// ============================================================
function resetAll() {
    if (antrian.length === 0) {
        showToast('⚠️ Tidak ada antrian', 'info');
        return;
    }
    if (!confirm('Hapus semua antrian?')) return;
    antrian = [];
    nomorTerakhir = 0;
    renderTabel();
    document.getElementById('ticket').classList.remove('show');
    localStorage.removeItem('antrianSembako');
    syncToFirebase();
    showToast('🔄 Semua antrian direset', 'info');
}

// ============================================================
// LIHAT DATABASE (Admin Only)
// ============================================================
function lihatDatabase() {
    if (masterPeserta.length === 0) {
        showToast('📂 Belum ada database', 'info');
        return;
    }
    let msg = `📋 DATABASE PESERTA\n${'═'.repeat(40)}\nTotal: ${masterPeserta.length} peserta\n\n`;
    masterPeserta.slice(0, 20).forEach((p, i) => {
        msg += `${String(i + 1).padStart(3)}. ${p.nip} | ${p.nama} | ${p.bagian}\n`;
    });
    if (masterPeserta.length > 20) msg += `\n... dan ${masterPeserta.length - 20} peserta lainnya`;
    alert(msg);
}

// ============================================================
// RESET DATABASE (Admin Only)
// ============================================================
function resetDatabase() {
    if (masterPeserta.length === 0) {
        showToast('⚠️ Database kosong', 'info');
        return;
    }
    if (!confirm(`Hapus database (${masterPeserta.length} peserta)?`)) return;
    masterPeserta = [];
    localStorage.removeItem('masterPeserta');
    syncToFirebase();
    updateDatabaseStatus();
    showToast('🗑️ Database direset', 'info');
}

// ============================================================
// CEK ANTRIAN SAYA (User Only)
// ============================================================
function lihatAntrianSaya() {
    const nip = prompt('Masukkan NIP Anda:');
    if (!nip) return;
    const data = antrian.find(a => a.nip === nip.trim());
    if (data) {
        showToast(`🎫 Nomor antrian Anda: ${data.nomor} (${data.nama})`, 'success');
    } else {
        showToast('😕 Anda belum mengambil antrian', 'info');
    }
}

// ============================================================
// LOCAL STORAGE
// ============================================================
function simpanKeLocalStorage() {
    localStorage.setItem('antrianSembako', JSON.stringify({ antrian, nomorTerakhir }));
}

function loadDariLocalStorage() {
    const data = localStorage.getItem('antrianSembako');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            antrian = parsed.antrian || [];
            nomorTerakhir = parsed.nomorTerakhir || 0;
            renderTabel();
            if (antrian.length > 0) {
                const last = antrian[antrian.length - 1];
                document.getElementById('nomorAntrian').textContent = last.nomor;
                document.getElementById('detailAntrian').innerHTML = `<strong>${last.nama}</strong> · ${last.bagian}`;
                const { tanggal, waktu } = formatTanggalWaktu();
                document.getElementById('tanggalAmbil').textContent = tanggal;
                document.getElementById('waktuAmbil').textContent = waktu;
                document.getElementById('ticket').classList.add('show');
            }
        } catch (e) {}
    }
}

function simpanSuggestionKeLocalStorage() {
    localStorage.setItem('masterPeserta', JSON.stringify(masterPeserta));
}

function loadSuggestionDariLocalStorage() {
    const data = localStorage.getItem('masterPeserta');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
                masterPeserta = parsed;
                return true;
            }
        } catch (e) {}
    }
    return false;
}

// ============================================================
// FIREBASE SYNC
// ============================================================
function syncToFirebase() {
    if (!firebaseEnabled || !database) return;
    try {
        const data = {
            antrian: antrian,
            nomorTerakhir: nomorTerakhir,
            masterPeserta: masterPeserta,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        };
        database.ref('antrianData').set(data);
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) syncStatus.innerHTML = '<i class="fas fa-cloud"></i> Sync OK';
    } catch (e) {
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) syncStatus.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i> Sync Failed';
    }
}

function loadFromFirebase() {
    if (!firebaseEnabled || !database) return;
    database.ref('antrianData').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            antrian = data.antrian || [];
            nomorTerakhir = data.nomorTerakhir || 0;
            if (data.masterPeserta && data.masterPeserta.length > 0) {
                masterPeserta = data.masterPeserta;
                simpanSuggestionKeLocalStorage();
                updateDatabaseStatus();
            }
            renderTabel();
            simpanKeLocalStorage();
            if (antrian.length > 0) {
                const last = antrian[antrian.length - 1];
                document.getElementById('nomorAntrian').textContent = last.nomor;
                document.getElementById('detailAntrian').innerHTML = `<strong>${last.nama}</strong> · ${last.bagian}`;
                const { tanggal, waktu } = formatTanggalWaktu();
                document.getElementById('tanggalAmbil').textContent = tanggal;
                document.getElementById('waktuAmbil').textContent = waktu;
                document.getElementById('ticket').classList.add('show');
            }
            const syncStatus = document.getElementById('syncStatus');
            if (syncStatus) syncStatus.innerHTML = '<i class="fas fa-cloud"></i> Sync OK';
        }
    }, (error) => {
        console.error('Firebase error:', error);
    });
}

// ============================================================
// INIT
// ============================================================
window.onload = function() {
    const hasData = loadSuggestionDariLocalStorage();
    if (!hasData) {
        masterPeserta = DEFAULT_PESERTA;
        simpanSuggestionKeLocalStorage();
    }

    loadDariLocalStorage();
    updateDatabaseStatus();

    if (firebaseEnabled) {
        loadFromFirebase();
    }

    if (antrian.length === 0) {
        document.getElementById('inputNip').focus();
    }

    if (firebaseEnabled) {
        setInterval(syncToFirebase, 30000);
    }
};