import { Command } from 'commander';
import fs from 'fs';

const program = new Command();

program
  .name('weather-cli')
  .description('CLI-програма для роботи з даними метеостанції')
  .version('1.0.0')
  .option('-f, --file <path>', 'шлях до JSON-файлу з даними', './data.json');

function loadData() {
  const options = program.opts();
  const filePath = options.file;

  if (!fs.existsSync(filePath)) {
    console.error(`Помилка: Файл за шляхом "${filePath}" не знайдено.`);
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
  } catch (err) {
    console.error(`Помилка: Не вдалося прочитати JSON-файл ("${err.message}").`);
    process.exit(1);
  }
}

// 1. Список усіх датчиків
program
  .command('list')
  .description('Показати список усіх датчиків')
  .option('-l, --limit <number>', 'обмежити кількість', parseInt)
  .action((options) => {
    const data = loadData();
    let sensors = data.sensors || [];
    if (options.limit && !isNaN(options.limit)) {
      sensors = sensors.slice(0, options.limit);
    }
    sensors.forEach((s) => {
      console.log(`[ID: ${s.id}] Тип: ${s.type} | Модель: ${s.model}`);
    });
  });

// 2. Один датчик повністю
program
  .command('item <id>')
  .description('Показати повну інформацію про один датчик')
  .action((id) => {
    const data = loadData();
    const sensor = (data.sensors || []).find((s) => String(s.id) === String(id));
    if (!sensor) {
      console.error(`Помилка: Датчик з ID "${id}" не знайдено.`);
      process.exit(1);
    }
    console.log(JSON.stringify(sensor, null, 2));
  });

// 3. Окреме вкладене поле
program
  .command('field <id> <path>')
  .description('Показати значення окремого поля (наприклад specs.unit)')
  .action((id, path) => {
    const data = loadData();
    const sensor = (data.sensors || []).find((s) => String(s.id) === String(id));
    if (!sensor) {
      console.error(`Помилка: Датчик з ID "${id}" не знайдено.`);
      process.exit(1);
    }

    const keys = path.split('.');
    let value = sensor;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        console.error(`Помилка: Поле "${path}" відсутнє.`);
        process.exit(1);
      }
    }
    console.log(value);
  });

// 4. Варіант 6: Характеристики
program
  .command('sensor-specs <id>')
  .description('Показати технічні характеристики (specs) датчика')
  .action((id) => {
    const data = loadData();
    const sensor = (data.sensors || []).find((s) => String(s.id) === String(id));
    if (!sensor) {
      console.error(`Помилка: Датчик з ID "${id}" не знайдено.`);
      process.exit(1);
    }
    console.log(`Характеристики датчика ${sensor.id} (${sensor.type}):`);
    console.log(JSON.stringify(sensor.specs, null, 2));
  });

// 5. Варіант 6: Серія показів з пропуском null
program
  .command('series <id>')
  .description('Серія показів датчика')
  .option('-s, --skip-missing', 'пропускати null')
  .action((id, options) => {
    const data = loadData();
    const sensor = (data.sensors || []).find((s) => String(s.id) === String(id));
    if (!sensor) {
      console.error(`Помилка: Датчик з ID "${id}" не знайдено.`);
      process.exit(1);
    }

    let readings = sensor.readings || [];
    if (options.skipMissing) {
      readings = readings.filter((r) => r !== null && r !== undefined);
    }

    console.log(`Серія показів для ${sensor.id}:`, readings);
  });

// 6. Варіант 6: Статистика
program
  .command('stats <id>')
  .description('Мінімум, максимум і середнє значення')
  .action((id) => {
    const data = loadData();
    const sensor = (data.sensors || []).find((s) => String(s.id) === String(id));
    if (!sensor) {
      console.error(`Помилка: Датчик з ID "${id}" не знайдено.`);
      process.exit(1);
    }

    const validReadings = (sensor.readings || []).filter(
      (r) => typeof r === 'number' && !isNaN(r)
    );

    if (validReadings.length === 0) {
      console.error(`Помилка: Для датчика "${id}" відсутні покази.`);
      process.exit(1);
    }

    const min = Math.min(...validReadings);
    const max = Math.max(...validReadings);
    const sum = validReadings.reduce((acc, val) => acc + val, 0);
    const avg = Number((sum / validReadings.length).toFixed(2));

    console.log(`Статистика для датчика ${sensor.id} (${sensor.type}):`);
    console.log(`  Одиниця: ${sensor.specs?.unit || 'н/д'}`);
    console.log(`  Мінімум: ${min}`);
    console.log(`  Максимум: ${max}`);
    console.log(`  Середнє:  ${avg}`);
  });

program.parse(process.argv);