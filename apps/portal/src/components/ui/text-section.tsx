import React from 'react';
import Image from 'next/image';
import { BlogEntry, TextSectionProps } from '../../lib/utils';

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const TEXT_CLASSES = {
  ascii: 'ascii-art scroll-reveal scroll-reveal-delay-1 mt-4 mb-5 pr-10 text-center font-mono text-sm text-gray-800 whitespace-pre',
  asciiSub: 'ascii-art scroll-reveal scroll-reveal-delay-1 pt-10 mt-14 mb-6 text-center font-mono text-[6px] text-gray-800 whitespace-pre',
  headline: 'scroll-reveal scroll-reveal-delay-1 pt-10 mt-14 mb-6 text-center text-[49px] font-bauhaus font-bold uppercase text-gray-900',
  introTitle: 'scroll-reveal scroll-reveal-delay-1 self-stretch mt-4 mb-12 text-center text-black text-6xl font-bauhaus font-bold leading-[54px] tracking-wide',
  introDescription: 'scroll-reveal scroll-reveal-delay-2 self-stretch mt-2 mb-12 text-left text-justify text-gray-800 text-sm font-ia-writer font-light leading-6 tracking-wide',
  h2Title: 'scroll-reveal scroll-reveal-delay-2 self-stretch mt-10 mb-6 text-center text-gray-900 text-xl font-bauhaus font-semibold tracking-wide',
  paragraph: 'scroll-reveal scroll-reveal-delay-2 ml-10 mr-5 text-left text-gray-900 text-sm font-ia-writer font-light leading-6'
} satisfies Record<string, string>;

export const TextSection: React.FC<TextSectionProps> = ({ type, content, options = {} }) => {
  switch (type) {
    case 'ascii':
      return (
        // https://www.asciiart.eu/text-to-ascii-art Elite
        <div className={TEXT_CLASSES.ascii}>
          {content}
        </div>
      );
    case 'ascii-sub':
      return (
        // https://www.asciiart.eu/text-to-ascii-art Elite
        <div className={TEXT_CLASSES.asciiSub}>
          {content}
        </div>
      );

    case 'headline':
      return (
        <div className={TEXT_CLASSES.headline}>
          {content}
        </div>
      );

    case 'intro-title':
      return (
        <div id="about" className={TEXT_CLASSES.introTitle}>
          {content}
        </div>
      );

    case 'intro-description':
      return (
        <div className={TEXT_CLASSES.introDescription}>
          {content}
        </div>
      );

    case 'h2-title':
      return (
        <h2 className={TEXT_CLASSES.h2Title}>
          {content}
        </h2>
      );
    case 'paragraph':
      return (
        <li className={TEXT_CLASSES.paragraph}>
          {content}
        </li>
      );

    default: {
      const className = typeof options.className === 'string' ? options.className : '';
      return (
        <div className={className}>
          {content}
        </div>
      );
    }
  }
};

interface BlogSectionProps {
  blogs: BlogEntry[];
  className?: string;
}

export const BlogSection: React.FC<BlogSectionProps> = ({ blogs, className }) => {
  if (!blogs.length) {
    return null;
  }

  const containerClassName = cn('self-stretch flex flex-col gap-14', className);

  const rowClass = (even: boolean) => cn(
    'scroll-reveal scroll-reveal-delay-2 self-stretch flex flex-col gap-8 md:gap-10 md:items-center',
    even ? 'md:flex-row' : 'md:flex-row-reverse'
  );
  const mediaClass = 'relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white aspect-[4/3] transition-transform duration-500 group-hover/image:-translate-y-1';
  const contentClass = (even: boolean) => cn(
    'w-full md:basis-[65%] md:flex-none flex flex-col gap-4',
    even ? null : 'md:items-end md:text-right'
  );
  const eyebrowClass = (even: boolean) => cn(
    'text-xs uppercase tracking-[0.2em] text-gray-500 font-ia-writer',
    even ? null : 'md:items-end md:text-right'
  );
  const titleClass = (even: boolean) => cn(
    'text-left text-gray-900 text-xl font-bauhaus font-semibold leading-snug',
    even ? null : 'md:text-right'
  );
  const descriptionClass = (even: boolean) => cn(
    'text-left text-gray-700 text-sm font-ia-writer font-light leading-relaxed',
    even ? null : 'md:text-right'
  );

  return (
    <div className={containerClassName}>
      {blogs.map((blog, index) => {
        const isEven = index % 2 === 0;

        return (
          <div
            key={`${blog.title}-${index}`}
            className={rowClass(isEven)}
          >
            <div className="w-full md:basis-[35%] md:flex-none">
              <a
                href={blog.cta?.href}
                target="_blank"
                rel="noreferrer"
                className="group/image block"
              >
                <div className={mediaClass}>
                  <Image
                    src={blog.imageSrc}
                    alt={blog.imageAlt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover/image:scale-[1.03]"
                    sizes="(min-width: 768px) 320px, 100vw"
                    priority={index === 0}
                  />
                </div>
              </a>
            </div>

            <div className={contentClass(isEven)}>
              {blog.eyebrow && (
                <span className={eyebrowClass(isEven)}>
                  {blog.eyebrow}
                </span>
              )}
              <h3 className={titleClass(isEven)}>
                <a
                  href={blog.cta?.href}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-gray-600"
                >
                  {blog.title}
                </a>
              </h3>
              <p className={descriptionClass(isEven)}>
                {blog.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
