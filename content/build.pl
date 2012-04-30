#!/usr/bin/perl

use strict;
use warnings;
use JSON;
use MIME::Base64;
use URI::Escape;

## constants

my $includes = "includes";
my $skin = "skin";

my $scriptstart = "/* This is a generated file. Do not edit. */\n\n// ==UserScript==\n";
my $scriptinclude = "// \@include ";
my $scriptend = "// ==/UserScript==\n\n";



# injected scripts
my @scripts = (
	{
		"output" => "all",
		"include" => [
			"http://*/*",
			"https://*/*"
		],
		"files" => [
			"wot.js",
			"encoded_files",
			"styles",
			"content/common.js",
			"content/warning.js",
			"content/url.js",
			"content/popup.js",
			"content/search.js"
		]
	}, {
		"output" => "web",
		"include" => [
			"http://www.mywot.com/*",
			"https://www.mywot.com/*"
		],
		"files" => [
			"wot.js",
			"content/common.js",
			"content/my.js",
			"content/settings.js"
		]
	}
);

# files to encode as data uris
my $files = {
	"skin/fusion/16_16/plain/r0.png" => { type => "image/png" },
	"skin/fusion/16_16/plain/r1.png" => { type => "image/png" },
	"skin/fusion/16_16/plain/r2.png" => { type => "image/png" },
	"skin/fusion/16_16/plain/r3.png" => { type => "image/png" },
	"skin/fusion/16_16/plain/r4.png" => { type => "image/png" },
	"skin/fusion/16_16/plain/r5.png" => { type => "image/png" },
	"skin/fusion/16_16/plain/rx.png" => { type => "image/png" },
	"skin/fusion/28_28/r0.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/28_28/r1.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/28_28/r2.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/28_28/r3.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/28_28/r4.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/28_28/r5.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/28_28/rx.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/confidence-0.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/confidence-1.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/confidence-2.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/confidence-3.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/confidence-4.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/confidence-5.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/popup-logo.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/popup.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/accessible/16_16/plain/r0.png" => { type => "image/png" },
	"skin/fusion/accessible/16_16/plain/r1.png" => { type => "image/png" },
	"skin/fusion/accessible/16_16/plain/r2.png" => { type => "image/png" },
	"skin/fusion/accessible/16_16/plain/r3.png" => { type => "image/png" },
	"skin/fusion/accessible/16_16/plain/r4.png" => { type => "image/png" },
	"skin/fusion/accessible/16_16/plain/r5.png" => { type => "image/png" },
	"skin/fusion/accessible/28_28/r0.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/accessible/28_28/r1.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/accessible/28_28/r2.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/accessible/28_28/r3.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/accessible/28_28/r4.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/accessible/28_28/r5.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/accessible/popup-logo.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/warnings/bg_rating_bottom.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/warnings/bg_rating_tile1px_center.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/warnings/bg_rating_top.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/warnings/bg_warning_bottom.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/warnings/bg_warning_tile1px_center.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/warnings/bg_warning_top.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/warnings/go_to_button.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/warnings/info_button_left.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/warnings/info_button_right.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/warnings/rate_button.png" => { type => "image/png", exclude => 1 },
	"skin/fusion/warnings/wot_logo_bottom.png" => { type => "image/png", exclude => 1 },
	"_locales/cs/warning.png" => { type => "image/png" },
	"_locales/de/warning.png" => { type => "image/png" },
	"_locales/en/warning.png" => { type => "image/png" },
	"_locales/es/warning.png" => { type => "image/png" },
	"_locales/fi/warning.png" => { type => "image/png" },
	"_locales/fr/warning.png" => { type => "image/png" },
	"_locales/it/warning.png" => { type => "image/png" },
	"_locales/ja/warning.png" => { type => "image/png" },
	"_locales/ko/warning.png" => { type => "image/png" },
	"_locales/pl/warning.png" => { type => "image/png" },
	"_locales/pt_BR/warning.png" => { type => "image/png" },
	"_locales/ru/warning.png" => { type => "image/png" },
	"_locales/sv/warning.png" => { type => "image/png" },
	"_locales/zh_CN/warning.png" => { type => "image/png" },
	"_locales/zh_TW/warning.png" => { type => "image/png" }
};

my $styles = {
	"skin/include/popup.css" => "",
	"skin/include/warning.css" => "",
	"skin/include/warning_mobile.css" => ""
};

my $encoded = {};

## globals

my $base;

## helpers

sub encodefile {
	my ($file, $type) = @_;

	open(FILE, "<$base/$file")
		or die "$0: failed to open file $base/$file: $!";

	my $data = "";

	while (read(FILE, my $buf, 60*57)) {
		$data .= encode_base64($buf);
	}
	
	close(FILE);

	$encoded->{$file} = "data:$type;base64," . uri_escape($data);
	return $encoded->{$file};
}

sub replacestyle {
	my ($file) = @_;

	open(FILE, "<$base/$file")
		or die "$0: failed to open file $base/$file: $!";

	my $data = "";

	while (<FILE>) {
		$data .= $_;
	}

	close(FILE);

	$data =~ s/\.\.\/fusion\//skin\/fusion\//g;

	foreach (keys(%{$encoded})) {
		my $value = $encoded->{$_};
		$data =~ s/$_/$value/g;
	}

	$styles->{$file} = $data;
}

sub wrap {
	my ($s, $len) = @_;

	my @r;

	for (my $i = 0; $i < length($s); $i += $len) {
		my $l = $len;

		if ($i + length($s) < $l) {
			$l = length($s) - $i;
		}

		push(@r, substr($s, $i, $l));
	}

	return @r;
}

sub appendencoded {
	print SCRIPT "/*\n\tFiles encoded as data URIs.\n*/\n\n";
	print SCRIPT "wot.files = {\n";

	foreach (keys(%{$encoded})) {
		if ($files->{$_}->{"exclude"}) {
			next;
		}

		print SCRIPT "\t\"$_\":\n\t\t\"" .
			join("\" +\n\t\t\"", wrap($encoded->{$_}, 60)) .
			"\",\n\n";
	}

	print SCRIPT "};\n\n";
}

sub appendstyles {
	print SCRIPT "/*\n\tStyles.\n*/\n\n";

	my $data = to_json($styles, { pretty => 1 });
	
	$data =~ s/\\n([^\"])/\\n\" + \n\t\"$1/g;
	$data =~ s/\"\\n/"\\n\" +\n\t\"/g;
	$data =~ s/\"\\t/\t\"\\t/g;
	$data =~ s/\ \:\ \"/\:\n\t\"/g;

	print SCRIPT "wot.styles = $data;\n\n";
}

sub appendscript {
	my ($file) = @_;

	open(INC, "<$base/$file")
		or die "$0: failed to open file $base/$file: $!";

	while (<INC>) {
		print SCRIPT $_;
	}

	print SCRIPT "\n";
	close(INC);
}

## main

($base) = $ARGV[0];

if (!defined($base)) {
	$base = ".";
}

# encode files
foreach (sort(keys(%{$files}))) {
	encodefile($_, $files->{$_}->{"type"});
}

# process styles
foreach (sort(keys(%{$styles}))) {
	replacestyle($_);
}

# create injected files
my $index = 0;

foreach my $script (@scripts) {
	my $file = sprintf("$includes/%02d-%s.js", $index++, $script->{"output"});

	open(SCRIPT, ">$base/$file")
		or die "$0: failed to open file $base/$file: $!";

	# script header
	print SCRIPT $scriptstart;

	foreach my $pattern (@{$script->{"include"}}) {
		print SCRIPT "$scriptinclude$pattern\n";
	}

	print SCRIPT $scriptend;

	# include files
	foreach my $include (@{$script->{"files"}}) {
		if ($include eq "encoded_files") {
			appendencoded();
		} elsif ($include eq "styles") {
			appendstyles();
		} else {
			appendscript($include);
		}
	}

	close(SCRIPT);
}
